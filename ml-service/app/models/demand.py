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


def _forecast_sma(ts: pd.Series, periods: int, window: int = 3) -> list[dict]:
    """Simple Moving Average forecast."""
    sma_value = float(ts.tail(window).mean())
    result = []
    last_date = ts.index[-1]
    for i in range(1, periods + 1):
        next_date = last_date + pd.DateOffset(months=i)
        result.append({
            "date": next_date.strftime("%Y-%m-%d"),
            "predicted_quantity": round(max(0, sma_value), 1),
            "lower_bound": round(max(0, sma_value * 0.7), 1),
            "upper_bound": round(sma_value * 1.3, 1),
        })
    return result


def _forecast_wma(ts: pd.Series, periods: int, window: int = 3) -> list[dict]:
    """Weighted Moving Average forecast (recent months weighted more)."""
    tail = ts.tail(window).values
    weights = np.arange(1, len(tail) + 1, dtype=float)
    weights /= weights.sum()
    wma_value = float(np.dot(tail, weights))
    result = []
    last_date = ts.index[-1]
    for i in range(1, periods + 1):
        next_date = last_date + pd.DateOffset(months=i)
        result.append({
            "date": next_date.strftime("%Y-%m-%d"),
            "predicted_quantity": round(max(0, wma_value), 1),
            "lower_bound": round(max(0, wma_value * 0.7), 1),
            "upper_bound": round(wma_value * 1.3, 1),
        })
    return result


def _detect_seasonality(ts: pd.Series) -> dict:
    """Basic seasonality detection via autocorrelation."""
    if len(ts) < 12:
        return {"is_seasonal": False, "period": None, "strength": 0}

    try:
        from statsmodels.tsa.stattools import acf
        autocorr = acf(ts, nlags=min(24, len(ts) - 1), fft=True)
        candidates = [3, 4, 6, 12]
        best_period = None
        best_val = 0.3

        for p in candidates:
            if p < len(autocorr) and autocorr[p] > best_val:
                best_val = autocorr[p]
                best_period = p

        return {
            "is_seasonal": best_period is not None,
            "period": best_period,
            "strength": round(float(best_val), 3) if best_period else 0,
        }
    except Exception:
        return {"is_seasonal": False, "period": None, "strength": 0}


def _prepare_weekly_time_series(demand_df: pd.DataFrame, product_id: str) -> Optional[pd.Series]:
    """Prepare a weekly time series for a specific product."""
    if demand_df.empty:
        return None

    product_data = demand_df[demand_df["product_id"] == product_id].copy()
    if product_data.empty:
        return None

    product_data["order_date"] = pd.to_datetime(product_data["order_date"], errors="coerce")
    product_data = product_data.dropna(subset=["order_date"])

    weekly = product_data.set_index("order_date").resample("W-MON")["quantity"].sum()
    weekly = weekly.fillna(0)

    if len(weekly) < 12:
        return None
    return weekly


def forecast_product_analytics(product_id: str, periods: int = 6,
                                method: str = "auto",
                                granularity: str = "monthly") -> Optional[dict]:
    """Enhanced forecast with method selection, CV, and seasonality detection."""
    demand_history = fetch_demand_history()
    if demand_history.empty:
        return None

    if granularity == "weekly":
        ts = _prepare_weekly_time_series(demand_history, product_id)
        periods = periods * 4
    else:
        ts = _prepare_time_series(demand_history, product_id)

    if ts is None:
        return None

    cv = float(ts.std() / ts.mean()) if ts.mean() > 0 else 0
    seasonality = _detect_seasonality(ts)

    if method == "auto":
        if cv > 1.5:
            method = "sma"
        elif seasonality["is_seasonal"] and len(ts) >= 24:
            method = "exponential_smoothing"
        elif len(ts) >= 12:
            method = "exponential_smoothing"
        else:
            method = "wma"

    if method == "sma":
        forecast_values = _forecast_sma(ts, periods)
    elif method == "wma":
        forecast_values = _forecast_wma(ts, periods)
    else:
        base_result = forecast_product(product_id, periods if granularity == "monthly" else periods // 4)
        forecast_values = base_result["forecast"] if base_result else _forecast_sma(ts, periods)

    product_name = ""
    product_data = demand_history[demand_history["product_id"] == product_id]
    if not product_data.empty and "product_name" in product_data.columns:
        product_name = str(product_data["product_name"].iloc[0])

    history_values = [
        {"date": date.strftime("%Y-%m-%d"), "quantity": round(float(val), 1)}
        for date, val in ts.tail(24 if granularity == "weekly" else 12).items()
    ]

    return {
        "prediction_type": "demand_analytics",
        "product_id": product_id,
        "product_name": product_name,
        "method": method,
        "granularity": granularity,
        "forecast": forecast_values,
        "history": history_values,
        "total_forecasted": round(sum(f["predicted_quantity"] for f in forecast_values), 1),
        "avg_historical": round(float(ts.mean()), 1),
        "cv": round(cv, 3),
        "high_variability": cv > 0.5,
        "seasonality": seasonality,
        "trend_direction": "increasing" if forecast_values and forecast_values[-1]["predicted_quantity"] > ts.mean() else "decreasing",
        "recommended_method": method,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def forecast_all_analytics(min_history_months: int = 6, periods: int = 6) -> list[dict]:
    """Forecast with full analytics for all products."""
    demand_history = fetch_demand_history()
    if demand_history.empty:
        return []

    product_ids = demand_history["product_id"].unique()
    results = []

    for pid in product_ids:
        result = forecast_product_analytics(str(pid), periods)
        if result:
            results.append(result)

    results.sort(key=lambda r: r.get("cv", 0), reverse=True)
    logger.info(f"Generated analytics forecasts for {len(results)}/{len(product_ids)} products")
    return results


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
