"""Supplier/vendor scoring model.

Composite scoring based on delivery reliability, pricing,
and order history from historical PO data.
"""

import numpy as np
import pandas as pd
import logging
from datetime import datetime, timezone
from typing import Optional

from app.data.pipeline import (
    fetch_po_delivery_history, fetch_vendor_metrics, fetch_job_purchase_orders,
    store_ml_prediction, update_model_metadata,
)

logger = logging.getLogger(__name__)


def _calculate_vendor_scores(po_history: pd.DataFrame, purchase_orders: pd.DataFrame) -> pd.DataFrame:
    """Calculate composite vendor scores from historical data."""
    scores = []

    if not po_history.empty:
        po_history["planned_date"] = pd.to_datetime(po_history["planned_date"], errors="coerce")
        po_history["actual_date"] = pd.to_datetime(po_history["actual_date"], errors="coerce")
        po_history["order_date"] = pd.to_datetime(po_history["order_date"], errors="coerce")

        po_history["is_on_time"] = po_history["actual_date"] <= po_history["planned_date"]
        po_history["delay_days"] = (po_history["actual_date"] - po_history["planned_date"]).dt.days.clip(lower=0)
        po_history["lead_time_days"] = (po_history["actual_date"] - po_history["order_date"]).dt.days

        vendor_stats = po_history.groupby("vendor_name").agg(
            delivery_count=("vendor_name", "count"),
            on_time_count=("is_on_time", "sum"),
            avg_delay=("delay_days", "mean"),
            avg_lead_time=("lead_time_days", "mean"),
            total_amount=("amount_total", "sum"),
        ).reset_index()

        vendor_stats["on_time_rate"] = vendor_stats["on_time_count"] / vendor_stats["delivery_count"]
        scores.append(vendor_stats)

    if not purchase_orders.empty:
        po_stats = purchase_orders.groupby("vendor_name").agg(
            total_po_count=("id", "count"),
            total_po_value=("amount_total", "sum"),
            avg_po_value=("amount_total", "mean"),
        ).reset_index()

        if scores:
            scores[0] = scores[0].merge(po_stats, on="vendor_name", how="outer")
        else:
            scores.append(po_stats)

    if not scores:
        return pd.DataFrame()

    combined = scores[0].fillna(0)

    max_rate = combined["on_time_rate"].max() if "on_time_rate" in combined.columns else 1
    max_volume = combined["total_po_value"].max() if "total_po_value" in combined.columns else 1
    min_delay = combined["avg_delay"].min() if "avg_delay" in combined.columns else 0

    combined["delivery_score"] = combined.get("on_time_rate", 0) * 100 if max_rate > 0 else 50
    combined["pricing_score"] = 50
    combined["reliability_score"] = np.where(
        combined.get("avg_delay", 0) > 0,
        np.clip(100 - combined.get("avg_delay", 0) * 5, 0, 100),
        80,
    )
    combined["volume_score"] = np.where(
        max_volume > 0,
        (combined.get("total_po_value", 0) / max_volume) * 100,
        50,
    )

    combined["composite_score"] = (
        combined["delivery_score"] * 0.35 +
        combined["reliability_score"] * 0.30 +
        combined["pricing_score"] * 0.15 +
        combined["volume_score"] * 0.20
    )

    return combined


def score_vendors() -> list[dict]:
    """Score all vendors and return sorted results."""
    po_history = fetch_po_delivery_history()
    purchase_orders = fetch_job_purchase_orders()

    scores = _calculate_vendor_scores(po_history, purchase_orders)
    if scores.empty:
        return []

    results = []
    for _, row in scores.iterrows():
        tier = "preferred"
        if row.get("composite_score", 0) < 50:
            tier = "review"
        elif row.get("composite_score", 0) < 70:
            tier = "standard"

        results.append({
            "prediction_type": "supplier_score",
            "vendor_name": str(row.get("vendor_name", "")),
            "composite_score": round(float(row.get("composite_score", 0)), 1),
            "delivery_score": round(float(row.get("delivery_score", 0)), 1),
            "reliability_score": round(float(row.get("reliability_score", 0)), 1),
            "pricing_score": round(float(row.get("pricing_score", 0)), 1),
            "volume_score": round(float(row.get("volume_score", 0)), 1),
            "on_time_rate": round(float(row.get("on_time_rate", 0)), 3),
            "avg_delay_days": round(float(row.get("avg_delay", 0)), 1),
            "total_orders": int(row.get("total_po_count", row.get("delivery_count", 0))),
            "total_value": round(float(row.get("total_po_value", row.get("total_amount", 0))), 2),
            "tier": tier,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        })

    results.sort(key=lambda x: x["composite_score"], reverse=True)
    return results


def train() -> dict:
    """Validate data and compute initial scores."""
    po_history = fetch_po_delivery_history()
    purchase_orders = fetch_job_purchase_orders()

    scores = _calculate_vendor_scores(po_history, purchase_orders)

    metrics = {
        "model_name": "supplier_scorer",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "vendors_scored": len(scores),
        "po_records": len(po_history),
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
    }

    update_model_metadata(metrics)
    return metrics
