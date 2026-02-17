"""Budget overrun early warning classifier.

Predicts the probability that a job will exceed its budget
at key milestones (25%, 50%, 75% budget utilization).
"""

import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.data.features import build_job_features, get_numeric_feature_columns
from app.data.pipeline import store_ml_prediction, update_model_metadata

logger = logging.getLogger(__name__)

MODEL_DIR = Path("app/model_artifacts")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "overrun_classifier.joblib"
SCALER_PATH = MODEL_DIR / "overrun_scaler.joblib"

_model: Optional[XGBClassifier] = None
_scaler: Optional[StandardScaler] = None


def train() -> dict:
    """Train the budget overrun early warning model."""
    global _model, _scaler

    logger.info("Training budget overrun classifier...")

    features = build_job_features()
    if features.empty:
        raise ValueError("No job data available for training")

    mask = (features["total_budget"] > 1000) & (features["total_actual"] > 0)
    training_data = features[mask].copy()

    if len(training_data) < 10:
        raise ValueError(f"Insufficient training data: {len(training_data)} jobs")

    y = (training_data["total_actual"] > training_data["total_budget"]).astype(int)

    feature_cols = get_numeric_feature_columns() + [
        "budget_utilization", "material_variance_pct",
        "non_material_variance_pct", "variance_imbalance",
    ]
    feature_cols = [c for c in feature_cols if c in training_data.columns]
    feature_cols = list(dict.fromkeys(feature_cols))

    X = training_data[feature_cols].fillna(0)

    _scaler = StandardScaler()
    X_scaled = _scaler.fit_transform(X)

    _model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=max(1, (y == 0).sum() / max(1, (y == 1).sum())),
        random_state=42,
        eval_metric="logloss",
    )

    n_splits = min(5, len(X))
    if n_splits >= 3 and y.nunique() > 1:
        cv_scores = cross_val_score(_model, X_scaled, y, cv=n_splits, scoring="roc_auc")
        auc_mean = cv_scores.mean()
        auc_std = cv_scores.std()
    else:
        auc_mean = 0.0
        auc_std = 0.0

    _model.fit(X_scaled, y)

    joblib.dump((_model, feature_cols), MODEL_PATH)
    joblib.dump(_scaler, SCALER_PATH)

    metrics = {
        "model_name": "overrun_classifier",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_samples": len(X),
        "overrun_rate": round(float(y.mean()), 3),
        "auc_score": round(float(auc_mean), 3),
        "auc_std": round(float(auc_std), 3),
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
    }

    update_model_metadata(metrics)
    logger.info(f"Overrun classifier trained: AUC={auc_mean:.3f}, overrun rate={y.mean():.1%}")

    return metrics


def load_model() -> bool:
    """Load a previously trained model from disk."""
    global _model, _scaler
    try:
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            loaded = joblib.load(MODEL_PATH)
            if isinstance(loaded, tuple):
                _model = loaded[0]
            else:
                _model = loaded
            _scaler = joblib.load(SCALER_PATH)
            logger.info("Overrun classifier loaded from disk")
            return True
    except Exception as e:
        logger.warning(f"Failed to load overrun classifier: {e}")
    return False


def predict(job_id: str) -> Optional[dict]:
    """Predict overrun probability for a specific job."""
    global _model, _scaler

    if _model is None:
        if not load_model():
            return None

    features = build_job_features()
    if features.empty:
        return None

    job_row = features[features["id"] == job_id]
    if job_row.empty:
        return None

    loaded = joblib.load(MODEL_PATH)
    if isinstance(loaded, tuple):
        _, feature_cols = loaded
    else:
        feature_cols = get_numeric_feature_columns() + [
            "budget_utilization", "material_variance_pct",
            "non_material_variance_pct", "variance_imbalance",
        ]
        feature_cols = [c for c in feature_cols if c in job_row.columns]
        feature_cols = list(dict.fromkeys(feature_cols))

    X = job_row[feature_cols].fillna(0)
    X_scaled = _scaler.transform(X)

    overrun_probability = float(_model.predict_proba(X_scaled)[0][1])

    job_data = job_row.iloc[0]
    budget = float(job_data.get("total_budget", 0))
    actual = float(job_data.get("total_actual", 0))
    utilization = actual / budget if budget > 0 else 0

    if utilization < 0.25:
        milestone = "early_stage"
    elif utilization < 0.50:
        milestone = "quarter_spent"
    elif utilization < 0.75:
        milestone = "half_spent"
    else:
        milestone = "three_quarter_spent"

    risk_level = "low"
    if overrun_probability > 0.7:
        risk_level = "high"
    elif overrun_probability > 0.4:
        risk_level = "medium"

    recommendations = []
    if risk_level == "high":
        recommendations = [
            {"action": "Immediate cost review meeting", "impact": "Critical",
             "description": "Schedule a review of all remaining budget items with the PM"},
            {"action": "Freeze non-essential purchases", "impact": "High",
             "description": "Pause discretionary spending until the budget is reassessed"},
        ]
    elif risk_level == "medium":
        recommendations = [
            {"action": "Weekly cost monitoring", "impact": "Medium",
             "description": "Increase the frequency of cost reviews from monthly to weekly"},
            {"action": "Review remaining POs", "impact": "Medium",
             "description": "Verify all pending purchase orders are necessary"},
        ]

    result = {
        "job_id": job_id,
        "prediction_type": "overrun_warning",
        "overrun_probability": round(overrun_probability, 3),
        "risk_level": risk_level,
        "milestone": milestone,
        "budget_utilization": round(utilization, 3),
        "budget": round(budget, 2),
        "actual": round(actual, 2),
        "recommendations": recommendations,
        "sale_order_name": str(job_data.get("sale_order_name", "")),
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    store_ml_prediction({
        "job_id": job_id,
        "prediction_type": "overrun_warning",
        "predicted_value": result["overrun_probability"],
        "confidence_level": abs(overrun_probability - 0.5) * 2,
        "model_version": result["model_version"],
        "generated_at": result["generated_at"],
        "metadata": {
            "risk_level": risk_level,
            "milestone": milestone,
        },
    })

    return result


def predict_all_active() -> list[dict]:
    """Predict overrun risk for all active jobs."""
    features = build_job_features()
    if features.empty:
        return []

    active = features[
        (features["status"] == "active") & (features["total_budget"] > 0)
    ]

    results = []
    for _, job in active.iterrows():
        result = predict(job["id"])
        if result:
            results.append(result)

    return results
