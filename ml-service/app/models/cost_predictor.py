"""Job cost prediction model using XGBoost.

Predicts final total cost for a job based on its characteristics,
replacing the simple linear burn-rate projection.
"""

import numpy as np
import pandas as pd
from xgboost import XGBRegressor
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

MODEL_PATH = MODEL_DIR / "cost_predictor.joblib"
SCALER_PATH = MODEL_DIR / "cost_predictor_scaler.joblib"

_model: Optional[XGBRegressor] = None
_scaler: Optional[StandardScaler] = None


def _get_training_data() -> tuple[pd.DataFrame, pd.Series]:
    """Get features and target for training.

    Uses completed jobs where we know the final cost.
    Filters to jobs with meaningful budget (> $1000) to avoid noise.
    """
    features = build_job_features()
    if features.empty:
        raise ValueError("No job data available for training")

    mask = (features["total_budget"] > 1000) & (features["total_actual"] > 0)
    training_data = features[mask].copy()

    if len(training_data) < 10:
        raise ValueError(f"Insufficient training data: {len(training_data)} jobs (need at least 10)")

    feature_cols = get_numeric_feature_columns()
    X = training_data[feature_cols].fillna(0)
    y = training_data["total_actual"]

    return X, y


def train() -> dict:
    """Train the cost prediction model.

    Returns training metrics.
    """
    global _model, _scaler

    logger.info("Training cost prediction model...")
    X, y = _get_training_data()

    _scaler = StandardScaler()
    X_scaled = _scaler.fit_transform(X)

    _model = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
    )

    n_splits = min(5, len(X))
    if n_splits >= 3:
        cv_scores = cross_val_score(_model, X_scaled, y, cv=n_splits, scoring="neg_mean_absolute_error")
        mae = -cv_scores.mean()
        mae_std = cv_scores.std()
    else:
        mae = 0.0
        mae_std = 0.0

    _model.fit(X_scaled, y)

    joblib.dump(_model, MODEL_PATH)
    joblib.dump(_scaler, SCALER_PATH)

    feature_importance = dict(zip(get_numeric_feature_columns(), _model.feature_importances_.tolist()))
    top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:10]

    metrics = {
        "model_name": "cost_predictor",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_samples": len(X),
        "mae": round(float(mae), 2),
        "mae_std": round(float(mae_std), 2),
        "top_features": [{"name": k, "importance": round(v, 4)} for k, v in top_features],
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
    }

    update_model_metadata(metrics)
    logger.info(f"Cost predictor trained: MAE=${mae:.2f} (+/- ${mae_std:.2f}), {len(X)} samples")

    return metrics


def load_model() -> bool:
    """Load a previously trained model from disk."""
    global _model, _scaler
    try:
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            _model = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            logger.info("Cost predictor model loaded from disk")
            return True
    except Exception as e:
        logger.warning(f"Failed to load cost predictor model: {e}")
    return False


def predict(job_id: str) -> Optional[dict]:
    """Predict the final cost for a specific job.

    Returns prediction with confidence interval.
    """
    global _model, _scaler

    if _model is None:
        if not load_model():
            logger.warning("No trained cost predictor model available")
            return None

    features = build_job_features()
    if features.empty:
        return None

    job_row = features[features["id"] == job_id]
    if job_row.empty:
        return None

    feature_cols = get_numeric_feature_columns()
    X = job_row[feature_cols].fillna(0)
    X_scaled = _scaler.transform(X)

    predicted_cost = float(_model.predict(X_scaled)[0])

    n_trees = _model.n_estimators
    tree_predictions = np.array([
        _model.get_booster().predict(
            __import__("xgboost").DMatrix(X_scaled, feature_names=feature_cols),
            iteration_range=(0, i + 1),
        )[0]
        for i in range(max(1, n_trees - 20), n_trees)
    ])
    prediction_std = float(np.std(tree_predictions)) if len(tree_predictions) > 1 else predicted_cost * 0.1

    confidence_lower = predicted_cost - 1.96 * prediction_std
    confidence_upper = predicted_cost + 1.96 * prediction_std

    job_data = job_row.iloc[0]
    current_actual = float(job_data["total_actual"])
    budget = float(job_data["total_budget"])

    predicted_cost = max(predicted_cost, current_actual)

    result = {
        "job_id": job_id,
        "prediction_type": "cost_prediction",
        "predicted_value": round(predicted_cost, 2),
        "confidence_lower": round(max(confidence_lower, current_actual), 2),
        "confidence_upper": round(confidence_upper, 2),
        "confidence_level": 0.95,
        "current_actual": round(current_actual, 2),
        "budget": round(budget, 2),
        "predicted_overrun": round(predicted_cost - budget, 2),
        "predicted_overrun_pct": round((predicted_cost - budget) / budget * 100, 1) if budget > 0 else 0,
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    store_ml_prediction({
        "job_id": job_id,
        "prediction_type": "cost_prediction",
        "predicted_value": result["predicted_value"],
        "confidence_lower": result["confidence_lower"],
        "confidence_upper": result["confidence_upper"],
        "confidence_level": result["confidence_level"],
        "features_used": feature_cols,
        "model_version": result["model_version"],
        "generated_at": result["generated_at"],
    })

    return result


def predict_all_active() -> list[dict]:
    """Run predictions for all active jobs using vectorized batch inference."""
    global _model, _scaler

    if _model is None:
        if not load_model():
            return []

    features = build_job_features()
    if features.empty:
        return []

    active_jobs = features[features["total_budget"] > 0].copy()
    if active_jobs.empty:
        return []

    feature_cols = get_numeric_feature_columns()
    X = active_jobs[feature_cols].fillna(0)
    X_scaled = _scaler.transform(X)

    predictions = _model.predict(X_scaled)

    results = []
    for i, (_, job) in enumerate(active_jobs.iterrows()):
        predicted_cost = max(float(predictions[i]), float(job["total_actual"]))
        budget = float(job["total_budget"])
        results.append({
            "job_id": job["id"],
            "prediction_type": "cost_prediction",
            "predicted_value": round(predicted_cost, 2),
            "current_actual": round(float(job["total_actual"]), 2),
            "budget": round(budget, 2),
            "predicted_overrun": round(predicted_cost - budget, 2),
            "predicted_overrun_pct": round((predicted_cost - budget) / budget * 100, 1) if budget > 0 else 0,
            "model_version": datetime.now(timezone.utc).strftime("%Y%m%d"),
        })

    return results
