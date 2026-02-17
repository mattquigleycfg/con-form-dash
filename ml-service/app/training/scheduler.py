"""Scheduled model retraining.

Periodically retrains all models using the latest data.
"""

import logging
from datetime import datetime, timezone
from typing import Callable

from app.models import cost_predictor, anomaly, waste_scorer, overrun
from app.models import lead_time, demand, customer_scoring, supplier_scoring

logger = logging.getLogger(__name__)

MODEL_TRAINERS: list[tuple[str, Callable]] = [
    ("cost_predictor", cost_predictor.train),
    ("anomaly_detector", anomaly.train),
    ("waste_scorer", waste_scorer.train),
    ("overrun_classifier", overrun.train),
    ("lead_time_predictor", lead_time.train),
    ("demand_forecaster", demand.train),
    ("customer_scorer", customer_scoring.train),
    ("supplier_scorer", supplier_scoring.train),
]


def retrain_all() -> dict:
    """Retrain all models and return results."""
    results = {}
    started_at = datetime.now(timezone.utc)

    for name, trainer in MODEL_TRAINERS:
        try:
            logger.info(f"Retraining {name}...")
            metrics = trainer()
            results[name] = {"status": "success", "metrics": metrics}
            logger.info(f"{name} retrained successfully")
        except Exception as e:
            error_msg = str(e)
            results[name] = {"status": "error", "error": error_msg}
            logger.error(f"Failed to retrain {name}: {error_msg}")

    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    success_count = sum(1 for r in results.values() if r["status"] == "success")

    return {
        "started_at": started_at.isoformat(),
        "elapsed_seconds": round(elapsed, 1),
        "models_trained": success_count,
        "models_failed": len(results) - success_count,
        "results": results,
    }


def retrain_model(model_name: str) -> dict:
    """Retrain a specific model."""
    trainer_map = dict(MODEL_TRAINERS)

    if model_name not in trainer_map:
        available = list(trainer_map.keys())
        raise ValueError(f"Unknown model: {model_name}. Available: {available}")

    try:
        metrics = trainer_map[model_name]()
        return {"status": "success", "model": model_name, "metrics": metrics}
    except Exception as e:
        return {"status": "error", "model": model_name, "error": str(e)}


def load_all_models() -> dict:
    """Load all pre-trained models from disk at startup."""
    loaders = [
        ("cost_predictor", cost_predictor.load_model),
        ("anomaly_detector", anomaly.load_model),
        ("waste_scorer", waste_scorer.load_model),
        ("overrun_classifier", overrun.load_model),
        ("lead_time_predictor", lead_time.load_model),
    ]

    results = {}
    for name, loader in loaders:
        try:
            loaded = loader()
            results[name] = "loaded" if loaded else "not_found"
        except Exception as e:
            results[name] = f"error: {e}"

    return results
