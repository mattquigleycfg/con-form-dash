"""Customer re-order prediction and scoring.

Uses RFM (Recency, Frequency, Monetary) analysis combined with
a gradient boosting model to predict which customers are likely
to place new orders.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.data.pipeline import (
    fetch_all_jobs, store_ml_prediction, update_model_metadata
)

logger = logging.getLogger(__name__)

MODEL_DIR = Path("app/model_artifacts")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "customer_scorer.joblib"
SCALER_PATH = MODEL_DIR / "customer_scaler.joblib"

_model: Optional[GradientBoostingClassifier] = None
_scaler: Optional[StandardScaler] = None


def _build_rfm_features(jobs: pd.DataFrame) -> pd.DataFrame:
    """Build RFM features per customer from job data."""
    if "date_order" in jobs.columns:
        jobs["date_order"] = pd.to_datetime(jobs["date_order"], errors="coerce")

    now = pd.Timestamp.now(tz="UTC")

    customer_agg = jobs.groupby("customer_name").agg(
        total_jobs=("id", "count"),
        total_revenue=("total_budget", "sum"),
        avg_job_value=("total_budget", "mean"),
        max_job_value=("total_budget", "max"),
        last_order_date=("date_order", "max"),
        first_order_date=("date_order", "min"),
        unique_pms=("project_manager_name", "nunique"),
        avg_margin_pct=("total_actual", lambda x: 0),
    ).reset_index()

    customer_agg["recency_days"] = (now - customer_agg["last_order_date"]).dt.days.fillna(9999)
    customer_agg["tenure_days"] = (now - customer_agg["first_order_date"]).dt.days.fillna(0)
    customer_agg["order_frequency"] = np.where(
        customer_agg["tenure_days"] > 0,
        customer_agg["total_jobs"] / (customer_agg["tenure_days"] / 365.25),
        0,
    )

    budgets = jobs.groupby("customer_name")["total_budget"].apply(list).reset_index()
    budgets.columns = ["customer_name", "budget_list"]
    customer_agg = customer_agg.merge(budgets, on="customer_name", how="left")

    customer_agg["value_trend"] = customer_agg["budget_list"].apply(
        lambda x: np.polyfit(range(len(x)), x, 1)[0] if isinstance(x, list) and len(x) >= 2 else 0
    )
    customer_agg.drop(columns=["budget_list"], inplace=True)

    return customer_agg


def train() -> dict:
    """Train the customer re-order prediction model."""
    global _model, _scaler

    logger.info("Training customer scoring model...")

    jobs = fetch_all_jobs()
    if jobs.empty:
        raise ValueError("No job data available")

    rfm = _build_rfm_features(jobs)
    if len(rfm) < 10:
        raise ValueError(f"Insufficient customers: {len(rfm)}")

    median_recency = rfm["recency_days"].median()
    y = (rfm["recency_days"] < median_recency * 1.5).astype(int)

    feature_cols = [
        "total_jobs", "total_revenue", "avg_job_value", "max_job_value",
        "recency_days", "tenure_days", "order_frequency",
        "unique_pms", "value_trend",
    ]

    X = rfm[feature_cols].fillna(0)

    _scaler = StandardScaler()
    X_scaled = _scaler.fit_transform(X)

    _model = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
    )
    _model.fit(X_scaled, y)

    joblib.dump((_model, feature_cols), MODEL_PATH)
    joblib.dump(_scaler, SCALER_PATH)

    metrics = {
        "model_name": "customer_scorer",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_samples": len(X),
        "active_customer_rate": round(float(y.mean()), 3),
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
    }

    update_model_metadata(metrics)
    return metrics


def load_model() -> bool:
    """Load model from disk."""
    global _model, _scaler
    try:
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            loaded = joblib.load(MODEL_PATH)
            _model = loaded[0] if isinstance(loaded, tuple) else loaded
            _scaler = joblib.load(SCALER_PATH)
            return True
    except Exception as e:
        logger.warning(f"Failed to load customer scorer: {e}")
    return False


def score_customers() -> list[dict]:
    """Score all customers for re-order likelihood."""
    global _model, _scaler

    if _model is None:
        if not load_model():
            return []

    jobs = fetch_all_jobs()
    if jobs.empty:
        return []

    rfm = _build_rfm_features(jobs)

    loaded = joblib.load(MODEL_PATH)
    feature_cols = loaded[1] if isinstance(loaded, tuple) else [
        "total_jobs", "total_revenue", "avg_job_value", "max_job_value",
        "recency_days", "tenure_days", "order_frequency", "unique_pms", "value_trend",
    ]

    X = rfm[feature_cols].fillna(0)
    X_scaled = _scaler.transform(X)

    probabilities = _model.predict_proba(X_scaled)[:, 1]

    results = []
    for i, (_, row) in enumerate(rfm.iterrows()):
        results.append({
            "prediction_type": "customer_reorder",
            "customer_name": str(row["customer_name"]),
            "reorder_probability": round(float(probabilities[i]), 3),
            "total_jobs": int(row["total_jobs"]),
            "total_revenue": round(float(row["total_revenue"]), 2),
            "recency_days": int(row["recency_days"]),
            "order_frequency_yearly": round(float(row["order_frequency"]), 2),
            "value_trend": round(float(row["value_trend"]), 2),
            "segment": "high_value" if probabilities[i] > 0.7 else "medium_value" if probabilities[i] > 0.4 else "at_risk",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        })

    results.sort(key=lambda x: x["reorder_probability"], reverse=True)
    return results
