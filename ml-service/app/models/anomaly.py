"""Anomaly detection model using Isolation Forest.

Replaces rule-based anomaly detection (fixed >30% threshold) with
ML-powered detection that learns normal cost patterns from historical data.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.data.features import build_job_features, get_anomaly_feature_columns
from app.data.pipeline import store_ml_prediction, update_model_metadata

logger = logging.getLogger(__name__)

MODEL_DIR = Path("app/model_artifacts")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "anomaly_detector.joblib"
SCALER_PATH = MODEL_DIR / "anomaly_scaler.joblib"

_model: Optional[IsolationForest] = None
_scaler: Optional[StandardScaler] = None


def train() -> dict:
    """Train the anomaly detection model on historical job cost patterns."""
    global _model, _scaler

    logger.info("Training anomaly detection model...")

    features = build_job_features()
    if features.empty:
        raise ValueError("No job data available for training")

    mask = (features["total_budget"] > 500) & (features["total_actual"] > 0)
    training_data = features[mask].copy()

    if len(training_data) < 10:
        raise ValueError(f"Insufficient training data: {len(training_data)} jobs")

    feature_cols = get_anomaly_feature_columns()
    X = training_data[feature_cols].fillna(0)

    _scaler = StandardScaler()
    X_scaled = _scaler.fit_transform(X)

    _model = IsolationForest(
        n_estimators=200,
        max_samples="auto",
        contamination=0.1,
        random_state=42,
        n_jobs=-1,
    )
    _model.fit(X_scaled)

    scores = _model.decision_function(X_scaled)
    predictions = _model.predict(X_scaled)
    n_anomalies = int((predictions == -1).sum())

    joblib.dump(_model, MODEL_PATH)
    joblib.dump(_scaler, SCALER_PATH)

    metrics = {
        "model_name": "anomaly_detector",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_samples": len(X),
        "anomalies_in_training": n_anomalies,
        "contamination_rate": round(n_anomalies / len(X), 3),
        "score_mean": round(float(scores.mean()), 4),
        "score_std": round(float(scores.std()), 4),
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
    }

    update_model_metadata(metrics)
    logger.info(f"Anomaly detector trained: {n_anomalies}/{len(X)} anomalies detected, {len(X)} samples")

    return metrics


def load_model() -> bool:
    """Load a previously trained model from disk."""
    global _model, _scaler
    try:
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            _model = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            logger.info("Anomaly detection model loaded from disk")
            return True
    except Exception as e:
        logger.warning(f"Failed to load anomaly detection model: {e}")
    return False


def score_job(job_id: str) -> Optional[dict]:
    """Score a specific job for anomalies.

    Returns anomaly score (0-1) and contributing factors.
    """
    global _model, _scaler

    if _model is None:
        if not load_model():
            logger.warning("No trained anomaly detection model available")
            return None

    features = build_job_features()
    if features.empty:
        return None

    job_row = features[features["id"] == job_id]
    if job_row.empty:
        return None

    feature_cols = get_anomaly_feature_columns()
    X = job_row[feature_cols].fillna(0)
    X_scaled = _scaler.transform(X)

    raw_score = float(_model.decision_function(X_scaled)[0])
    is_anomaly = int(_model.predict(X_scaled)[0] == -1)

    anomaly_score = max(0, min(1, 0.5 - raw_score))

    feature_values = X.iloc[0].to_dict()
    all_features = build_job_features()
    all_X = all_features[feature_cols].fillna(0)
    feature_means = all_X.mean()
    feature_stds = all_X.std().replace(0, 1)

    contributing_factors = []
    for col in feature_cols:
        z_score = abs((feature_values[col] - feature_means[col]) / feature_stds[col])
        if z_score > 1.5:
            contributing_factors.append({
                "feature": col,
                "value": round(float(feature_values[col]), 4),
                "mean": round(float(feature_means[col]), 4),
                "z_score": round(float(z_score), 2),
                "direction": "above" if feature_values[col] > feature_means[col] else "below",
            })

    contributing_factors.sort(key=lambda x: x["z_score"], reverse=True)

    severity = "info"
    if anomaly_score > 0.7:
        severity = "critical"
    elif anomaly_score > 0.4:
        severity = "warning"

    job_data = job_row.iloc[0]

    result = {
        "job_id": job_id,
        "prediction_type": "anomaly_score",
        "anomaly_score": round(anomaly_score, 3),
        "is_anomaly": bool(is_anomaly),
        "severity": severity,
        "raw_score": round(raw_score, 4),
        "contributing_factors": contributing_factors[:5],
        "sale_order_name": str(job_data.get("sale_order_name", "")),
        "total_budget": round(float(job_data.get("total_budget", 0)), 2),
        "total_actual": round(float(job_data.get("total_actual", 0)), 2),
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    store_ml_prediction({
        "job_id": job_id,
        "prediction_type": "anomaly_score",
        "predicted_value": result["anomaly_score"],
        "confidence_level": 1.0 - anomaly_score,
        "features_used": feature_cols,
        "model_version": result["model_version"],
        "generated_at": result["generated_at"],
        "metadata": {
            "is_anomaly": result["is_anomaly"],
            "severity": result["severity"],
            "contributing_factors": result["contributing_factors"],
        },
    })

    return result


def score_all_active() -> list[dict]:
    """Score all active jobs using vectorized batch inference."""
    global _model, _scaler

    if _model is None:
        if not load_model():
            return []

    features = build_job_features()
    if features.empty:
        return []

    active_jobs = features[
        (features["total_budget"] > 0) & (features["total_actual"] > 0)
    ].copy()
    if active_jobs.empty:
        return []

    feature_cols = get_anomaly_feature_columns()
    X = active_jobs[feature_cols].fillna(0)
    X_scaled = _scaler.transform(X)

    raw_scores = _model.decision_function(X_scaled)
    preds = _model.predict(X_scaled)

    results = []
    for i, (_, job) in enumerate(active_jobs.iterrows()):
        anomaly_score = max(0, min(1, 0.5 - float(raw_scores[i])))
        severity = "critical" if anomaly_score > 0.7 else "warning" if anomaly_score > 0.4 else "info"
        results.append({
            "job_id": job["id"],
            "prediction_type": "anomaly_score",
            "anomaly_score": round(anomaly_score, 3),
            "is_anomaly": bool(preds[i] == -1),
            "severity": severity,
            "sale_order_name": str(job.get("sale_order_name", "")),
            "total_budget": round(float(job.get("total_budget", 0)), 2),
            "total_actual": round(float(job.get("total_actual", 0)), 2),
            "model_version": datetime.now(timezone.utc).strftime("%Y%m%d"),
        })

    return results
