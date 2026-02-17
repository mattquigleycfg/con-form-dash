"""Con-form ML Service - FastAPI application.

Provides ML prediction endpoints for the Con-form Dashboard.
Connects to Supabase PostgreSQL and Odoo ERP for historical data.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from app.config import get_settings
from app.training.scheduler import retrain_all, retrain_model, load_all_models
from app.models import cost_predictor, anomaly, waste_scorer, overrun
from app.models import lead_time, demand, customer_scoring, supplier_scoring

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

api_key_header = APIKeyHeader(name="X-ML-API-Key", auto_error=False)


async def verify_api_key(api_key: Optional[str] = Security(api_key_header)):
    settings = get_settings()
    if settings.ml_api_key and api_key != settings.ml_api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ML Service...")
    loaded = load_all_models()
    logger.info(f"Model loading results: {loaded}")
    yield
    logger.info("Shutting down ML Service...")


app = FastAPI(
    title="Con-form ML Service",
    description="Machine learning prediction service for the Con-form Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health & Status ──────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/models/status")
async def model_status(api_key: str = Depends(verify_api_key)):
    loaded = load_all_models()
    return {"models": loaded}


# ── Training Endpoints ───────────────────────────────────────────────────────

class TrainRequest(BaseModel):
    model_name: Optional[str] = None


@app.post("/train")
async def train_models(request: TrainRequest, api_key: str = Depends(verify_api_key)):
    try:
        if request.model_name:
            result = retrain_model(request.model_name)
        else:
            result = retrain_all()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Cost Prediction ──────────────────────────────────────────────────────────

class CostPredictionRequest(BaseModel):
    job_id: str


class BatchPredictionRequest(BaseModel):
    job_ids: Optional[list[str]] = None


@app.post("/predict/cost")
async def predict_cost(request: CostPredictionRequest, api_key: str = Depends(verify_api_key)):
    result = cost_predictor.predict(request.job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found or model not trained")
    return result


@app.post("/predict/cost/batch")
async def predict_cost_batch(request: BatchPredictionRequest, api_key: str = Depends(verify_api_key)):
    if request.job_ids:
        results = []
        for jid in request.job_ids:
            r = cost_predictor.predict(jid)
            if r:
                results.append(r)
        return {"predictions": results}
    else:
        results = cost_predictor.predict_all_active()
        return {"predictions": results}


# ── Anomaly Detection ────────────────────────────────────────────────────────

class AnomalyRequest(BaseModel):
    job_id: str


@app.post("/predict/anomaly")
async def predict_anomaly(request: AnomalyRequest, api_key: str = Depends(verify_api_key)):
    result = anomaly.score_job(request.job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found or model not trained")
    return result


@app.post("/predict/anomaly/batch")
async def predict_anomaly_batch(api_key: str = Depends(verify_api_key)):
    results = anomaly.score_all_active()
    return {"predictions": results}


# ── Waste Risk ───────────────────────────────────────────────────────────────

class WasteRiskRequest(BaseModel):
    job_id: str


@app.post("/predict/waste")
async def predict_waste(request: WasteRiskRequest, api_key: str = Depends(verify_api_key)):
    result = waste_scorer.predict(request.job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found or model not trained")
    return result


@app.post("/predict/waste/batch")
async def predict_waste_batch(api_key: str = Depends(verify_api_key)):
    results = waste_scorer.predict_all_active()
    return {"predictions": results}


# ── Budget Overrun Warning ───────────────────────────────────────────────────

class OverrunRequest(BaseModel):
    job_id: str


@app.post("/predict/overrun")
async def predict_overrun(request: OverrunRequest, api_key: str = Depends(verify_api_key)):
    result = overrun.predict(request.job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found or model not trained")
    return result


@app.post("/predict/overrun/batch")
async def predict_overrun_batch(api_key: str = Depends(verify_api_key)):
    results = overrun.predict_all_active()
    return {"predictions": results}


# ── Lead Time Prediction ─────────────────────────────────────────────────────

class LeadTimeRequest(BaseModel):
    vendor_name: str
    product_category: str = "unknown"
    amount: float = 0
    quantity: float = 0


@app.post("/predict/lead-time")
async def predict_lead_time(request: LeadTimeRequest, api_key: str = Depends(verify_api_key)):
    result = lead_time.predict(
        request.vendor_name, request.product_category,
        request.amount, request.quantity,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Lead time model not trained")
    return result


# ── Demand Forecast ──────────────────────────────────────────────────────────

class DemandForecastRequest(BaseModel):
    product_id: str
    periods: int = 6


@app.post("/predict/demand")
async def predict_demand(request: DemandForecastRequest, api_key: str = Depends(verify_api_key)):
    result = demand.forecast_product(request.product_id, request.periods)
    if result is None:
        raise HTTPException(status_code=404, detail="Insufficient data for product forecast")
    return result


@app.post("/predict/demand/all")
async def predict_demand_all(api_key: str = Depends(verify_api_key)):
    results = demand.forecast_all_products()
    return {"forecasts": results}


# ── Customer Scoring ─────────────────────────────────────────────────────────

@app.post("/predict/customers")
async def predict_customers(api_key: str = Depends(verify_api_key)):
    results = customer_scoring.score_customers()
    return {"customers": results}


# ── Supplier Scoring ─────────────────────────────────────────────────────────

@app.post("/predict/suppliers")
async def predict_suppliers(api_key: str = Depends(verify_api_key)):
    results = supplier_scoring.score_vendors()
    return {"vendors": results}


# ── Combined ML Insights ─────────────────────────────────────────────────────

class MLInsightsRequest(BaseModel):
    job_id: Optional[str] = None


@app.post("/insights")
async def ml_insights(request: MLInsightsRequest, api_key: str = Depends(verify_api_key)):
    """Get all ML insights for a job (or all active jobs)."""
    results = {
        "cost_predictions": [],
        "anomaly_scores": [],
        "waste_risks": [],
        "overrun_warnings": [],
    }

    try:
        if request.job_id:
            cp = cost_predictor.predict(request.job_id)
            if cp:
                results["cost_predictions"].append(cp)

            an = anomaly.score_job(request.job_id)
            if an:
                results["anomaly_scores"].append(an)

            wr = waste_scorer.predict(request.job_id)
            if wr:
                results["waste_risks"].append(wr)

            ov = overrun.predict(request.job_id)
            if ov:
                results["overrun_warnings"].append(ov)
        else:
            results["cost_predictions"] = cost_predictor.predict_all_active()
            results["anomaly_scores"] = anomaly.score_all_active()
            results["waste_risks"] = waste_scorer.predict_all_active()
            results["overrun_warnings"] = overrun.predict_all_active()
    except Exception as e:
        logger.error(f"Error generating insights: {e}")

    results["generated_at"] = datetime.now(timezone.utc).isoformat()
    results["total_insights"] = sum(len(v) for v in results.values() if isinstance(v, list))

    return results
