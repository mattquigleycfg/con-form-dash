"""Material waste risk prediction model.

Replaces the fixed >20% threshold with a classifier that predicts
waste probability at job creation time, with SHAP explanations.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
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

MODEL_PATH = MODEL_DIR / "waste_scorer.joblib"
SCALER_PATH = MODEL_DIR / "waste_scorer_scaler.joblib"

WASTE_THRESHOLD = 0.15

_model: Optional[RandomForestClassifier] = None
_scaler: Optional[StandardScaler] = None


def _create_waste_labels(features: pd.DataFrame) -> pd.Series:
    """Create binary waste labels: 1 if material actual > budget by threshold."""
    return (
        (features["material_actual"] > features["material_budget"] * (1 + WASTE_THRESHOLD)) &
        (features["material_budget"] > 500)
    ).astype(int)


def train() -> dict:
    """Train the waste risk classifier."""
    global _model, _scaler

    logger.info("Training waste risk classifier...")

    features = build_job_features()
    if features.empty:
        raise ValueError("No job data available for training")

    mask = (features["material_budget"] > 500) & (features["material_actual"] > 0)
    training_data = features[mask].copy()

    if len(training_data) < 10:
        raise ValueError(f"Insufficient training data: {len(training_data)} jobs")

    y = _create_waste_labels(training_data)

    feature_cols = [
        "total_budget", "material_budget", "non_material_budget",
        "material_budget_ratio", "budget_line_count", "unique_products",
        "bom_component_count", "bom_total_cost", "bom_avg_unit_cost",
        "po_count", "unique_vendors", "has_subcontractor",
        "order_month", "order_quarter",
        "has_installation", "has_freight", "has_cranage",
    ]

    X = training_data[feature_cols].fillna(0)

    _scaler = StandardScaler()
    X_scaled = _scaler.fit_transform(X)

    _model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )

    n_splits = min(5, len(X))
    if n_splits >= 3:
        cv_scores = cross_val_score(_model, X_scaled, y, cv=n_splits, scoring="f1")
        f1_mean = cv_scores.mean()
        f1_std = cv_scores.std()
    else:
        f1_mean = 0.0
        f1_std = 0.0

    _model.fit(X_scaled, y)

    joblib.dump(_model, MODEL_PATH)
    joblib.dump(_scaler, SCALER_PATH)

    feature_importance = dict(zip(feature_cols, _model.feature_importances_.tolist()))
    top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:10]

    metrics = {
        "model_name": "waste_scorer",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_samples": len(X),
        "positive_rate": round(float(y.mean()), 3),
        "f1_score": round(float(f1_mean), 3),
        "f1_std": round(float(f1_std), 3),
        "top_features": [{"name": k, "importance": round(v, 4)} for k, v in top_features],
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
    }

    update_model_metadata(metrics)
    logger.info(f"Waste scorer trained: F1={f1_mean:.3f}, positive rate={y.mean():.1%}, {len(X)} samples")

    return metrics


def load_model() -> bool:
    """Load a previously trained model from disk."""
    global _model, _scaler
    try:
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            _model = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            logger.info("Waste scorer model loaded from disk")
            return True
    except Exception as e:
        logger.warning(f"Failed to load waste scorer model: {e}")
    return False


def predict(job_id: str) -> Optional[dict]:
    """Predict waste risk for a specific job with feature explanations."""
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

    feature_cols = [
        "total_budget", "material_budget", "non_material_budget",
        "material_budget_ratio", "budget_line_count", "unique_products",
        "bom_component_count", "bom_total_cost", "bom_avg_unit_cost",
        "po_count", "unique_vendors", "has_subcontractor",
        "order_month", "order_quarter",
        "has_installation", "has_freight", "has_cranage",
    ]

    X = job_row[feature_cols].fillna(0)
    X_scaled = _scaler.transform(X)

    waste_probability = float(_model.predict_proba(X_scaled)[0][1])

    try:
        import shap
        explainer = shap.TreeExplainer(_model)
        shap_values = explainer.shap_values(X)
        if isinstance(shap_values, list):
            shap_vals = shap_values[1][0]
        else:
            shap_vals = shap_values[0]

        feature_explanations = []
        for i, col in enumerate(feature_cols):
            if abs(shap_vals[i]) > 0.01:
                feature_explanations.append({
                    "feature": col,
                    "shap_value": round(float(shap_vals[i]), 4),
                    "feature_value": round(float(X.iloc[0][col]), 4),
                    "direction": "increases_risk" if shap_vals[i] > 0 else "decreases_risk",
                })
        feature_explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
    except Exception as e:
        logger.warning(f"SHAP explanation failed: {e}")
        importances = _model.feature_importances_
        feature_explanations = [
            {
                "feature": col,
                "importance": round(float(importances[i]), 4),
                "feature_value": round(float(X.iloc[0][col]), 4),
            }
            for i, col in enumerate(feature_cols)
            if importances[i] > 0.02
        ]
        feature_explanations.sort(key=lambda x: x.get("importance", 0), reverse=True)

    risk_level = "low"
    if waste_probability > 0.7:
        risk_level = "high"
    elif waste_probability > 0.4:
        risk_level = "medium"

    severity = "info"
    if risk_level == "high":
        severity = "critical"
    elif risk_level == "medium":
        severity = "warning"

    job_data = job_row.iloc[0]

    recommendations = []
    if risk_level in ("high", "medium"):
        recommendations.append({
            "action": "Review BOM quantities before ordering",
            "impact": "High",
            "description": "Cross-check material estimates with historical usage on similar jobs",
        })
        recommendations.append({
            "action": "Implement staged material ordering",
            "impact": "Medium",
            "description": "Order materials in phases rather than all up front to reduce waste",
        })
    if waste_probability > 0.5:
        recommendations.append({
            "action": "Assign waste tracking to project manager",
            "impact": "High",
            "description": "Monitor actual material consumption vs ordered quantities weekly",
            "expected_savings": round(float(job_data.get("material_budget", 0)) * 0.05, 2),
        })

    result = {
        "job_id": job_id,
        "prediction_type": "waste_risk",
        "waste_probability": round(waste_probability, 3),
        "risk_level": risk_level,
        "severity": severity,
        "feature_explanations": feature_explanations[:5],
        "recommendations": recommendations,
        "sale_order_name": str(job_data.get("sale_order_name", "")),
        "material_budget": round(float(job_data.get("material_budget", 0)), 2),
        "material_actual": round(float(job_data.get("material_actual", 0)), 2),
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    store_ml_prediction({
        "job_id": job_id,
        "prediction_type": "waste_risk",
        "predicted_value": result["waste_probability"],
        "confidence_level": 1.0 - abs(0.5 - waste_probability) * 2,
        "model_version": result["model_version"],
        "generated_at": result["generated_at"],
        "metadata": {
            "risk_level": risk_level,
            "severity": severity,
            "feature_explanations": result["feature_explanations"],
        },
    })

    return result


def predict_all_active() -> list[dict]:
    """Score all active jobs for waste risk."""
    features = build_job_features()
    if features.empty:
        return []

    active = features[
        (features["material_budget"] > 500)
    ]

    results = []
    for _, job in active.iterrows():
        result = predict(job["id"])
        if result:
            results.append(result)

    return results
