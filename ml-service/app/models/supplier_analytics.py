"""Supplier analytics: lead time distributions, price trends, single-source risk.

Provides granular per-vendor-per-product insights beyond the composite score.
"""

import numpy as np
import pandas as pd
import logging
from datetime import datetime, timezone
from typing import Optional

from app.data.pipeline import (
    fetch_supplier_product_metrics,
    fetch_po_delivery_history,
)

logger = logging.getLogger(__name__)


def calculate_lead_time_distribution(vendor_name: Optional[str] = None,
                                     product_id: Optional[str] = None) -> list[dict]:
    """Lead time histogram + stats per vendor (optionally per product)."""
    history = fetch_po_delivery_history()
    if history.empty:
        return []

    history["lead_time_days"] = pd.to_numeric(history["lead_time_days"], errors="coerce")
    df = history.dropna(subset=["lead_time_days"])
    df = df[df["lead_time_days"] > 0]

    if vendor_name:
        df = df[df["vendor_name"] == vendor_name]
    if product_id:
        df = df[df.get("product_id", pd.Series(dtype=str)) == product_id]

    if df.empty:
        return []

    results = []
    groups = df.groupby("vendor_name") if not vendor_name else [("all", df)]

    for name, group in (df.groupby("vendor_name") if not vendor_name else [(vendor_name, df)]):
        lt = group["lead_time_days"].values
        bins = np.histogram_bin_edges(lt, bins="auto")
        counts, edges = np.histogram(lt, bins=bins)

        histogram = [
            {"bin_start": round(float(edges[i]), 1),
             "bin_end": round(float(edges[i + 1]), 1),
             "count": int(counts[i])}
            for i in range(len(counts))
        ]

        results.append({
            "vendor_name": str(name),
            "mean": round(float(np.mean(lt)), 1),
            "std": round(float(np.std(lt, ddof=1)) if len(lt) > 1 else 0, 1),
            "median": round(float(np.median(lt)), 1),
            "min": round(float(np.min(lt)), 1),
            "max": round(float(np.max(lt)), 1),
            "p90": round(float(np.percentile(lt, 90)), 1),
            "sample_count": len(lt),
            "histogram": histogram,
        })

    return results


def calculate_price_trends(vendor_name: Optional[str] = None,
                           product_id: Optional[str] = None) -> list[dict]:
    """Rolling average unit price over time per vendor-product pair."""
    spm = fetch_supplier_product_metrics()
    history = fetch_po_delivery_history()

    if history.empty:
        return []

    history["order_date"] = pd.to_datetime(history["order_date"], errors="coerce")
    history["amount_total"] = pd.to_numeric(history["amount_total"], errors="coerce")
    history["quantity"] = pd.to_numeric(history["quantity"], errors="coerce")
    history = history.dropna(subset=["order_date", "amount_total"])
    history = history[history["quantity"] > 0]

    if vendor_name:
        history = history[history["vendor_name"] == vendor_name]

    if history.empty:
        return []

    history["unit_price"] = history["amount_total"] / history["quantity"]

    results = []
    for (vname,), group in history.groupby(["vendor_name"]):
        monthly = group.set_index("order_date").resample("MS")["unit_price"].mean().dropna()
        if len(monthly) < 2:
            continue

        data_points = [
            {"date": d.strftime("%Y-%m-%d"), "avg_price": round(float(v), 2)}
            for d, v in monthly.items()
        ]

        first_half = monthly.iloc[:len(monthly) // 2].mean()
        second_half = monthly.iloc[len(monthly) // 2:].mean()
        trend_pct = ((second_half - first_half) / first_half * 100) if first_half > 0 else 0

        results.append({
            "vendor_name": str(vname),
            "data_points": data_points,
            "overall_avg": round(float(monthly.mean()), 2),
            "trend_pct": round(float(trend_pct), 1),
            "months_of_data": len(monthly),
        })

    return results


def detect_single_source_risk() -> list[dict]:
    """Products supplied by only one vendor -- supply chain risk."""
    spm = fetch_supplier_product_metrics()
    if spm.empty:
        return []

    vendor_counts = spm.groupby("product_id").agg(
        vendor_count=("vendor_name", "nunique"),
        product_name=("product_name", "first"),
        total_spend=("total_spend", "sum"),
        vendors=("vendor_name", lambda x: list(x.unique())),
    ).reset_index()

    single_source = vendor_counts[vendor_counts["vendor_count"] == 1]
    if single_source.empty:
        return []

    results = []
    for _, row in single_source.sort_values("total_spend", ascending=False).iterrows():
        results.append({
            "product_id": str(row["product_id"]),
            "product_name": str(row["product_name"]),
            "sole_vendor": row["vendors"][0] if row["vendors"] else "",
            "total_spend": round(float(row["total_spend"]), 2),
            "risk_level": "high" if row["total_spend"] > 10000 else "medium",
        })

    return results


def get_supplier_detail(vendor_name: str) -> dict:
    """Full analytics for a single supplier -- called by drill-down."""
    spm = fetch_supplier_product_metrics()
    if spm.empty:
        return {"vendor_name": vendor_name, "products": []}

    vendor_data = spm[spm["vendor_name"] == vendor_name]
    if vendor_data.empty:
        return {"vendor_name": vendor_name, "products": []}

    products = []
    for _, row in vendor_data.iterrows():
        products.append({
            "product_id": str(row.get("product_id", "")),
            "product_name": str(row.get("product_name", "")),
            "avg_lead_time": float(row.get("avg_lead_time", 0)),
            "lead_time_stddev": float(row.get("lead_time_stddev", 0)),
            "on_time_rate": float(row.get("on_time_rate", 0)),
            "avg_delay_days": float(row.get("avg_delay_days", 0)),
            "avg_unit_price": float(row.get("avg_unit_price", 0)),
            "price_trend_pct": float(row.get("price_trend_pct", 0)),
            "total_orders": int(row.get("total_orders", 0)),
            "total_qty": float(row.get("total_qty", 0)),
            "total_spend": float(row.get("total_spend", 0)),
        })

    return {
        "vendor_name": vendor_name,
        "product_count": len(products),
        "total_spend": round(sum(p["total_spend"] for p in products), 2),
        "avg_on_time_rate": round(np.mean([p["on_time_rate"] for p in products]) if products else 0, 3),
        "products": sorted(products, key=lambda p: p["total_spend"], reverse=True),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def get_full_analytics() -> dict:
    """Aggregate analytics: distributions, price trends, single-source risks."""
    return {
        "lead_time_distributions": calculate_lead_time_distribution(),
        "price_trends": calculate_price_trends(),
        "single_source_risks": detect_single_source_risk(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
