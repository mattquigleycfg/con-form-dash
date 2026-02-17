"""Data pipeline for fetching historical data from Supabase and Odoo."""

import pandas as pd
from supabase import create_client, Client
from typing import Optional
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def fetch_all_jobs() -> pd.DataFrame:
    """Fetch all jobs with their cost data."""
    client = get_supabase_client()
    response = client.table("jobs").select("*").execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def fetch_job_budget_lines(job_id: Optional[str] = None) -> pd.DataFrame:
    """Fetch budget lines, optionally filtered by job."""
    client = get_supabase_client()
    query = client.table("job_budget_lines").select("*")
    if job_id:
        query = query.eq("job_id", job_id)
    response = query.execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def fetch_job_bom_lines(job_id: Optional[str] = None) -> pd.DataFrame:
    """Fetch BOM lines for material cost analysis."""
    client = get_supabase_client()
    query = client.table("job_bom_lines").select("*")
    if job_id:
        query = query.eq("job_id", job_id)
    response = query.execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def fetch_job_non_material_costs(job_id: Optional[str] = None) -> pd.DataFrame:
    """Fetch non-material costs."""
    client = get_supabase_client()
    query = client.table("job_non_material_costs").select("*")
    if job_id:
        query = query.eq("job_id", job_id)
    response = query.execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def fetch_job_purchase_orders(job_id: Optional[str] = None) -> pd.DataFrame:
    """Fetch purchase orders linked to jobs."""
    client = get_supabase_client()
    query = client.table("job_purchase_orders").select("*")
    if job_id:
        query = query.eq("job_id", job_id)
    response = query.execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def fetch_po_delivery_history() -> pd.DataFrame:
    """Fetch PO delivery history for lead time analysis."""
    client = get_supabase_client()
    response = client.table("po_delivery_history").select("*").execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def fetch_production_history() -> pd.DataFrame:
    """Fetch manufacturing order history."""
    client = get_supabase_client()
    response = client.table("production_history").select("*").execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def fetch_demand_history() -> pd.DataFrame:
    """Fetch product demand time series."""
    client = get_supabase_client()
    response = client.table("demand_history").select("*").execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def fetch_vendor_metrics() -> pd.DataFrame:
    """Fetch aggregated vendor performance metrics."""
    client = get_supabase_client()
    response = client.table("vendor_metrics").select("*").execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def fetch_ml_predictions(prediction_type: Optional[str] = None) -> pd.DataFrame:
    """Fetch cached ML predictions."""
    client = get_supabase_client()
    query = client.table("ml_predictions").select("*")
    if prediction_type:
        query = query.eq("prediction_type", prediction_type)
    response = query.execute()
    if not response.data:
        return pd.DataFrame()
    return pd.DataFrame(response.data)


def store_ml_prediction(prediction: dict) -> None:
    """Store a prediction result in the database."""
    client = get_supabase_client()
    client.table("ml_predictions").upsert(prediction).execute()


def store_ml_predictions_batch(predictions: list[dict]) -> None:
    """Store multiple prediction results."""
    if not predictions:
        return
    client = get_supabase_client()
    client.table("ml_predictions").upsert(predictions).execute()


def update_model_metadata(metadata: dict) -> None:
    """Track model version and training metrics.

    Maps arbitrary model metrics into the table's fixed schema:
    model_name, model_version, trained_at, training_samples, metrics (jsonb),
    top_features (jsonb), status.
    """
    client = get_supabase_client()

    known_cols = {"model_name", "model_version", "trained_at", "training_samples", "status"}
    row = {}
    extra_metrics = {}

    for k, v in metadata.items():
        if k == "top_features":
            row["top_features"] = v
        elif k in known_cols:
            row[k] = v
        else:
            extra_metrics[k] = v

    row["metrics"] = extra_metrics
    if "model_name" not in row:
        return

    client.table("ml_model_metadata").upsert(
        row, on_conflict="model_name"
    ).execute()


def fetch_model_metadata(model_name: str) -> Optional[dict]:
    """Get the latest model metadata."""
    client = get_supabase_client()
    response = (
        client.table("ml_model_metadata")
        .select("*")
        .eq("model_name", model_name)
        .order("trained_at", desc=True)
        .limit(1)
        .execute()
    )
    if response.data:
        return response.data[0]
    return None
