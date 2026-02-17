"""Vendor lead time prediction model.

Predicts delivery lead times based on vendor, product, and order characteristics.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import cross_val_score
import joblib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.data.pipeline import fetch_po_delivery_history, fetch_vendor_metrics
from app.data.pipeline import store_ml_prediction, update_model_metadata

logger = logging.getLogger(__name__)

MODEL_DIR = Path("app/model_artifacts")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "lead_time_predictor.joblib"
SCALER_PATH = MODEL_DIR / "lead_time_scaler.joblib"
ENCODERS_PATH = MODEL_DIR / "lead_time_encoders.joblib"

_model: Optional[GradientBoostingRegressor] = None
_scaler: Optional[StandardScaler] = None
_encoders: Optional[dict] = None


def train() -> dict:
    """Train the lead time prediction model on PO delivery history."""
    global _model, _scaler, _encoders

    logger.info("Training lead time prediction model...")

    history = fetch_po_delivery_history()
    if history.empty or len(history) < 10:
        raise ValueError(f"Insufficient PO delivery history: {len(history)} records")

    history["planned_date"] = pd.to_datetime(history["planned_date"], errors="coerce")
    history["actual_date"] = pd.to_datetime(history["actual_date"], errors="coerce")
    history["order_date"] = pd.to_datetime(history["order_date"], errors="coerce")

    history = history.dropna(subset=["order_date", "actual_date"])

    history["lead_time_days"] = (history["actual_date"] - history["order_date"]).dt.days
    history = history[history["lead_time_days"] > 0]

    if len(history) < 10:
        raise ValueError(f"Insufficient valid PO records after filtering: {len(history)}")

    _encoders = {}
    for col in ["vendor_name", "product_category"]:
        if col in history.columns:
            le = LabelEncoder()
            history[f"{col}_encoded"] = le.fit_transform(history[col].fillna("unknown").astype(str))
            _encoders[col] = le

    feature_cols = []
    if "vendor_name_encoded" in history.columns:
        feature_cols.append("vendor_name_encoded")
    if "product_category_encoded" in history.columns:
        feature_cols.append("product_category_encoded")
    if "amount_total" in history.columns:
        feature_cols.append("amount_total")
    if "quantity" in history.columns:
        feature_cols.append("quantity")

    history["order_month"] = history["order_date"].dt.month
    history["order_dow"] = history["order_date"].dt.dayofweek
    feature_cols.extend(["order_month", "order_dow"])

    vendor_metrics = fetch_vendor_metrics()
    if not vendor_metrics.empty and "vendor_name" in vendor_metrics.columns:
        history = history.merge(
            vendor_metrics[["vendor_name", "avg_lead_time", "on_time_rate"]],
            on="vendor_name", how="left", suffixes=("", "_vm")
        )
        for col in ["avg_lead_time", "on_time_rate"]:
            if col in history.columns:
                feature_cols.append(col)

    history[feature_cols] = history[feature_cols].fillna(0)

    X = history[feature_cols]
    y = history["lead_time_days"]

    _scaler = StandardScaler()
    X_scaled = _scaler.fit_transform(X)

    _model = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
    )

    n_splits = min(5, len(X))
    if n_splits >= 3:
        cv_scores = cross_val_score(_model, X_scaled, y, cv=n_splits, scoring="neg_mean_absolute_error")
        mae = -cv_scores.mean()
    else:
        mae = 0.0

    _model.fit(X_scaled, y)

    joblib.dump((_model, feature_cols), MODEL_PATH)
    joblib.dump(_scaler, SCALER_PATH)
    joblib.dump(_encoders, ENCODERS_PATH)

    metrics = {
        "model_name": "lead_time_predictor",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_samples": len(X),
        "mae_days": round(float(mae), 1),
        "avg_lead_time": round(float(y.mean()), 1),
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
    }

    update_model_metadata(metrics)
    logger.info(f"Lead time predictor trained: MAE={mae:.1f} days, {len(X)} samples")

    return metrics


def load_model() -> bool:
    """Load model from disk."""
    global _model, _scaler, _encoders
    try:
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            loaded = joblib.load(MODEL_PATH)
            if isinstance(loaded, tuple):
                _model = loaded[0]
            else:
                _model = loaded
            _scaler = joblib.load(SCALER_PATH)
            if ENCODERS_PATH.exists():
                _encoders = joblib.load(ENCODERS_PATH)
            return True
    except Exception as e:
        logger.warning(f"Failed to load lead time model: {e}")
    return False


def predict(vendor_name: str, product_category: str = "unknown",
            amount: float = 0, quantity: float = 0) -> Optional[dict]:
    """Predict lead time for a new purchase order."""
    global _model, _scaler, _encoders

    if _model is None:
        if not load_model():
            return None

    loaded = joblib.load(MODEL_PATH)
    if isinstance(loaded, tuple):
        _, feature_cols = loaded
    else:
        return None

    features = {}
    if _encoders and "vendor_name" in _encoders:
        le = _encoders["vendor_name"]
        if vendor_name in le.classes_:
            features["vendor_name_encoded"] = le.transform([vendor_name])[0]
        else:
            features["vendor_name_encoded"] = -1
    if _encoders and "product_category" in _encoders:
        le = _encoders["product_category"]
        if product_category in le.classes_:
            features["product_category_encoded"] = le.transform([product_category])[0]
        else:
            features["product_category_encoded"] = -1

    features["amount_total"] = amount
    features["quantity"] = quantity
    now = datetime.now()
    features["order_month"] = now.month
    features["order_dow"] = now.weekday()

    X = pd.DataFrame([{col: features.get(col, 0) for col in feature_cols}])
    X_scaled = _scaler.transform(X)

    predicted_days = float(_model.predict(X_scaled)[0])
    predicted_days = max(1, predicted_days)

    return {
        "prediction_type": "lead_time",
        "vendor_name": vendor_name,
        "product_category": product_category,
        "predicted_lead_time_days": round(predicted_days, 1),
        "predicted_delivery_date": (now + pd.Timedelta(days=predicted_days)).strftime("%Y-%m-%d"),
        "confidence_range_days": round(predicted_days * 0.2, 1),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
