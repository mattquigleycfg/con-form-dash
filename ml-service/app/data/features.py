"""Feature engineering for ML models."""

import pandas as pd
import numpy as np
from typing import Optional
import logging

from app.data.pipeline import (
    fetch_all_jobs,
    fetch_job_budget_lines,
    fetch_job_bom_lines,
    fetch_job_non_material_costs,
    fetch_job_purchase_orders,
)

logger = logging.getLogger(__name__)


def build_job_features() -> pd.DataFrame:
    """Build a feature matrix from job data for cost prediction and anomaly detection.

    Returns a DataFrame with one row per job and engineered features.
    """
    jobs = fetch_all_jobs()
    if jobs.empty:
        return pd.DataFrame()

    budget_lines = fetch_job_budget_lines()
    bom_lines = fetch_job_bom_lines()
    non_material_costs = fetch_job_non_material_costs()
    purchase_orders = fetch_job_purchase_orders()

    features = jobs[["id", "total_budget", "material_budget", "non_material_budget",
                      "total_actual", "material_actual", "non_material_actual",
                      "customer_name", "project_manager_name", "status",
                      "date_order", "created_at", "updated_at",
                      "subcontractor_name", "project_stage_name"]].copy()

    features["material_budget_ratio"] = np.where(
        features["total_budget"] > 0,
        features["material_budget"] / features["total_budget"],
        0
    )

    features["non_material_budget_ratio"] = np.where(
        features["total_budget"] > 0,
        features["non_material_budget"] / features["total_budget"],
        0
    )

    features["budget_utilization"] = np.where(
        features["total_budget"] > 0,
        features["total_actual"] / features["total_budget"],
        0
    )

    features["material_variance_pct"] = np.where(
        features["material_budget"] > 0,
        (features["material_actual"] - features["material_budget"]) / features["material_budget"],
        0
    )

    features["non_material_variance_pct"] = np.where(
        features["non_material_budget"] > 0,
        (features["non_material_actual"] - features["non_material_budget"]) / features["non_material_budget"],
        0
    )

    features["total_variance_pct"] = np.where(
        features["total_budget"] > 0,
        (features["total_actual"] - features["total_budget"]) / features["total_budget"],
        0
    )

    features["variance_imbalance"] = abs(
        features["material_variance_pct"] - features["non_material_variance_pct"]
    )

    features["actual_margin"] = features["total_budget"] - features["total_actual"]
    features["actual_margin_pct"] = np.where(
        features["total_budget"] > 0,
        features["actual_margin"] / features["total_budget"],
        0
    )

    if not budget_lines.empty:
        bl_agg = budget_lines.groupby("job_id").agg(
            budget_line_count=("id", "count"),
            unique_products=("product_name", "nunique"),
            avg_line_subtotal=("subtotal", "mean"),
            max_line_subtotal=("subtotal", "max"),
            material_line_count=("cost_category", lambda x: (x == "material").sum()),
            non_material_line_count=("cost_category", lambda x: (x == "non_material").sum()),
        ).reset_index()
        features = features.merge(bl_agg, left_on="id", right_on="job_id", how="left", suffixes=("", "_bl"))
        if "job_id_bl" in features.columns:
            features.drop(columns=["job_id_bl"], inplace=True, errors="ignore")
        elif "job_id" in features.columns and features.columns.tolist().count("job_id") > 0:
            pass
    else:
        for col in ["budget_line_count", "unique_products", "avg_line_subtotal",
                     "max_line_subtotal", "material_line_count", "non_material_line_count"]:
            features[col] = 0

    if not bom_lines.empty:
        bom_agg = bom_lines.groupby("job_id").agg(
            bom_component_count=("id", "count"),
            bom_total_cost=("total_cost", "sum"),
            bom_avg_unit_cost=("unit_cost", "mean"),
            bom_total_quantity=("quantity", "sum"),
        ).reset_index()
        features = features.merge(bom_agg, left_on="id", right_on="job_id", how="left", suffixes=("", "_bom"))
        if "job_id_bom" in features.columns:
            features.drop(columns=["job_id_bom"], inplace=True, errors="ignore")
    else:
        for col in ["bom_component_count", "bom_total_cost", "bom_avg_unit_cost", "bom_total_quantity"]:
            features[col] = 0

    if not non_material_costs.empty:
        nmc_agg = non_material_costs.groupby("job_id").agg(
            nmc_entry_count=("id", "count"),
            nmc_total=("amount", "sum"),
            nmc_types=("cost_type", "nunique"),
            has_installation=("cost_type", lambda x: int((x == "installation").any())),
            has_freight=("cost_type", lambda x: int((x == "freight").any())),
            has_cranage=("cost_type", lambda x: int((x == "cranage").any())),
            has_travel=("cost_type", lambda x: int((x == "travel").any())),
        ).reset_index()
        features = features.merge(nmc_agg, left_on="id", right_on="job_id", how="left", suffixes=("", "_nmc"))
        if "job_id_nmc" in features.columns:
            features.drop(columns=["job_id_nmc"], inplace=True, errors="ignore")
    else:
        for col in ["nmc_entry_count", "nmc_total", "nmc_types",
                     "has_installation", "has_freight", "has_cranage", "has_travel"]:
            features[col] = 0

    if not purchase_orders.empty:
        po_agg = purchase_orders.groupby("job_id").agg(
            po_count=("id", "count"),
            po_total_amount=("amount_total", "sum"),
            po_avg_amount=("amount_total", "mean"),
            unique_vendors=("vendor_name", "nunique"),
        ).reset_index()
        features = features.merge(po_agg, left_on="id", right_on="job_id", how="left", suffixes=("", "_po"))
        if "job_id_po" in features.columns:
            features.drop(columns=["job_id_po"], inplace=True, errors="ignore")
    else:
        for col in ["po_count", "po_total_amount", "po_avg_amount", "unique_vendors"]:
            features[col] = 0

    features.fillna(0, inplace=True)

    features["job_size_category"] = pd.cut(
        features["total_budget"],
        bins=[0, 10000, 50000, 200000, float("inf")],
        labels=["small", "medium", "large", "enterprise"],
    )

    features["has_subcontractor"] = (features["subcontractor_name"] != "0").astype(int) & \
                                     (features["subcontractor_name"] != "").astype(int)

    if features["date_order"].dtype == "object":
        features["date_order"] = pd.to_datetime(features["date_order"], errors="coerce")
    if features["created_at"].dtype == "object":
        features["created_at"] = pd.to_datetime(features["created_at"], errors="coerce")

    features["order_month"] = features["date_order"].dt.month.fillna(0).astype(int)
    features["order_quarter"] = features["date_order"].dt.quarter.fillna(0).astype(int)

    return features


def get_numeric_feature_columns() -> list[str]:
    """Return the list of numeric features used for model training."""
    return [
        "total_budget", "material_budget", "non_material_budget",
        "material_budget_ratio", "non_material_budget_ratio",
        "budget_line_count", "unique_products", "avg_line_subtotal", "max_line_subtotal",
        "material_line_count", "non_material_line_count",
        "bom_component_count", "bom_total_cost", "bom_avg_unit_cost", "bom_total_quantity",
        "nmc_entry_count", "nmc_total", "nmc_types",
        "has_installation", "has_freight", "has_cranage", "has_travel",
        "po_count", "po_total_amount", "po_avg_amount", "unique_vendors",
        "has_subcontractor", "order_month", "order_quarter",
    ]


def get_anomaly_feature_columns() -> list[str]:
    """Return features used for anomaly detection."""
    return [
        "material_budget_ratio", "non_material_budget_ratio",
        "budget_utilization", "material_variance_pct", "non_material_variance_pct",
        "total_variance_pct", "variance_imbalance", "actual_margin_pct",
        "budget_line_count", "bom_component_count",
        "nmc_entry_count", "po_count", "unique_vendors",
    ]
