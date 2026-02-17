"""Demand forecasting model using statistical time series methods.

Forecasts product demand for MRP planning based on historical sales data.
Uses statsmodels for ARIMA-based forecasting as a lightweight alternative to Prophet.
"""

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.stattools import adfuller
import logging
from datetime import datetime, timezone
from typing import Optional

from app.data.pipeline import fetch_demand_history, store_ml_prediction, update_model_metadata

logger = logging.getLogger(__name__)


def _prepare_time_series(demand_df: pd.DataFrame, product_id: str) -> Optional[pd.Series]:
    """Prepare a monthly time series for a specific product."""
    if demand_df.empty:
        return None

    product_data = demand_df[demand_df["product_id"] == product_id].copy()
    if product_data.empty:
        return None

    product_data["order_date"] = pd.to_datetime(product_data["order_date"], errors="coerce")
    product_data = product_data.dropna(subset=["order_date"])

    monthly = product_data.set_index("order_date").resample("MS")["quantity"].sum()
    monthly = monthly.fillna(0)

    if len(monthly) < 6:
        return None

    return monthly


def forecast_product(product_id: str, periods: int = 6) -> Optional[dict]:
    """Forecast demand for a specific product.

    Args:
        product_id: The product identifier.
        periods: Number of months to forecast.

    Returns:
        Forecast dict with predictions and confidence intervals.
    """
    demand_history = fetch_demand_history()
    if demand_history.empty:
        return None

    ts = _prepare_time_series(demand_history, product_id)
    if ts is None:
        return None

    try:
        seasonal_periods = min(12, len(ts) // 2)
        if seasonal_periods >= 4 and len(ts) >= seasonal_periods * 2:
            model = ExponentialSmoothing(
                ts,
                trend="add",
                seasonal="add",
                seasonal_periods=seasonal_periods,
                initialization_method="estimated",
            )
        else:
            model = ExponentialSmoothing(
                ts,
                trend="add",
                seasonal=None,
                initialization_method="estimated",
            )

        fitted = model.fit(optimized=True)
        forecast = fitted.forecast(periods)

        residuals = fitted.resid.dropna()
        residual_std = float(residuals.std()) if len(residuals) > 0 else 0

        forecast_values = []
        for date, value in forecast.items():
            forecast_values.append({
                "date": date.strftime("%Y-%m-%d"),
                "predicted_quantity": round(max(0, float(value)), 1),
                "lower_bound": round(max(0, float(value) - 1.96 * residual_std), 1),
                "upper_bound": round(max(0, float(value) + 1.96 * residual_std), 1),
            })

        product_name = ""
        product_data = demand_history[demand_history["product_id"] == product_id]
        if not product_data.empty and "product_name" in product_data.columns:
            product_name = str(product_data["product_name"].iloc[0])

        history_values = [
            {"date": date.strftime("%Y-%m-%d"), "quantity": round(float(val), 1)}
            for date, val in ts.tail(12).items()
        ]

        result = {
            "prediction_type": "demand_forecast",
            "product_id": product_id,
            "product_name": product_name,
            "forecast_periods": periods,
            "forecast": forecast_values,
            "history": history_values,
            "total_forecasted": round(sum(f["predicted_quantity"] for f in forecast_values), 1),
            "avg_monthly_historical": round(float(ts.mean()), 1),
            "trend_direction": "increasing" if forecast_values[-1]["predicted_quantity"] > ts.mean() else "decreasing",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        return result

    except Exception as e:
        logger.warning(f"Forecast failed for product {product_id}: {e}")
        return None


def forecast_all_products(min_history_months: int = 6, periods: int = 6) -> list[dict]:
    """Forecast demand for all products with sufficient history."""
    demand_history = fetch_demand_history()
    if demand_history.empty:
        return []

    product_ids = demand_history["product_id"].unique()
    results = []

    for pid in product_ids:
        result = forecast_product(str(pid), periods)
        if result:
            results.append(result)

    logger.info(f"Generated forecasts for {len(results)}/{len(product_ids)} products")
    return results


def train() -> dict:
    """Train/validate demand forecasting (stateless - just validates data availability)."""
    demand_history = fetch_demand_history()

    if demand_history.empty:
        return {
            "model_name": "demand_forecaster",
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "status": "no_data",
            "training_samples": 0,
        }

    product_count = demand_history["product_id"].nunique()
    total_records = len(demand_history)

    forecastable = 0
    for pid in demand_history["product_id"].unique():
        ts = _prepare_time_series(demand_history, str(pid))
        if ts is not None:
            forecastable += 1

    metrics = {
        "model_name": "demand_forecaster",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "status": "ready",
        "total_products": product_count,
        "forecastable_products": forecastable,
        "total_records": total_records,
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
    }

    update_model_metadata(metrics)
    return metrics
