"""Reorder rule engine: EOQ, Min/Max, Periodic Review, safety stock, ROP.

Calculates optimal reorder parameters and compares against current Odoo
settings, flagging discrepancies.
"""

import numpy as np
import pandas as pd
import logging
from datetime import datetime, timezone
from typing import Optional
from scipy import stats as scipy_stats

from app.data.pipeline import (
    fetch_demand_history,
    fetch_inventory_snapshot,
    fetch_supplier_product_metrics,
    fetch_reorder_rules,
    upsert_reorder_rules,
    update_model_metadata,
)

logger = logging.getLogger(__name__)

Z_SCORES = {0.90: 1.282, 0.95: 1.645, 0.99: 2.326}


def calculate_eoq(annual_demand: float, ordering_cost: float = 50.0,
                   holding_cost_rate: float = 0.25,
                   unit_cost: float = 1.0) -> float:
    """Economic Order Quantity: Q* = sqrt(2*D*S / H)."""
    if annual_demand <= 0 or unit_cost <= 0:
        return 0
    holding_cost = unit_cost * holding_cost_rate
    if holding_cost <= 0:
        return annual_demand
    return float(np.sqrt(2 * annual_demand * ordering_cost / holding_cost))


def calculate_safety_stock(service_level: float, lead_time_days: float,
                           lead_time_std: float, daily_demand_std: float) -> float:
    """Safety Stock = Z * sqrt(LT * sigma_d^2 + d_avg^2 * sigma_LT^2).

    Simplified: SS = Z * sigma_demand_during_lead_time
    """
    z = Z_SCORES.get(service_level, 1.645)
    lt_periods = max(1, lead_time_days)
    ss = z * np.sqrt(lt_periods * daily_demand_std ** 2 + lead_time_std ** 2)
    return max(0, float(ss))


def calculate_rop(avg_daily_demand: float, lead_time_days: float,
                  safety_stock: float) -> float:
    """Reorder Point = avg_demand * lead_time + safety_stock."""
    return avg_daily_demand * lead_time_days + safety_stock


def _get_demand_stats(product_id: str) -> dict:
    """Calculate demand statistics for a product."""
    demand = fetch_demand_history()
    if demand.empty:
        return {"avg_daily": 0, "std_daily": 0, "annual": 0, "cv": 0}

    prod = demand[demand["product_id"] == product_id].copy()
    if prod.empty:
        return {"avg_daily": 0, "std_daily": 0, "annual": 0, "cv": 0}

    prod["order_date"] = pd.to_datetime(prod["order_date"], errors="coerce")
    prod["quantity"] = pd.to_numeric(prod["quantity"], errors="coerce")
    prod = prod.dropna(subset=["order_date", "quantity"])

    if prod.empty:
        return {"avg_daily": 0, "std_daily": 0, "annual": 0, "cv": 0}

    date_range = (prod["order_date"].max() - prod["order_date"].min()).days
    days = max(date_range, 1)

    total_qty = float(prod["quantity"].sum())
    avg_daily = total_qty / days
    annual = avg_daily * 365

    monthly = prod.set_index("order_date").resample("MS")["quantity"].sum()
    monthly_std = float(monthly.std()) if len(monthly) > 1 else 0
    daily_std = monthly_std / 30.0
    cv = (monthly_std / monthly.mean()) if monthly.mean() > 0 else 0

    return {
        "avg_daily": round(avg_daily, 3),
        "std_daily": round(daily_std, 3),
        "annual": round(annual, 1),
        "cv": round(float(cv), 3),
    }


def _get_lead_time_stats(product_id: str) -> dict:
    """Get lead time stats for primary supplier of a product."""
    spm = fetch_supplier_product_metrics()
    if spm.empty:
        return {"avg_days": 14, "std_days": 3, "vendor": "unknown", "unit_price": 0}

    prod = spm[spm["product_id"] == product_id]
    if prod.empty:
        return {"avg_days": 14, "std_days": 3, "vendor": "unknown", "unit_price": 0}

    best = prod.sort_values("total_spend", ascending=False).iloc[0]
    return {
        "avg_days": float(best.get("avg_lead_time", 14)),
        "std_days": float(best.get("lead_time_stddev", 3)),
        "vendor": str(best.get("vendor_name", "unknown")),
        "unit_price": float(best.get("avg_unit_price", 0)),
    }


def calculate_reorder_rules_for_product(product_id: str,
                                         service_level: float = 0.95,
                                         reorder_model: str = "eoq") -> Optional[dict]:
    """Calculate optimal reorder parameters for a single product."""
    demand = _get_demand_stats(product_id)
    lt = _get_lead_time_stats(product_id)

    if demand["annual"] <= 0:
        return None

    ss = calculate_safety_stock(service_level, lt["avg_days"], lt["std_days"], demand["std_daily"])
    rop = calculate_rop(demand["avg_daily"], lt["avg_days"], ss)

    if reorder_model == "eoq":
        order_qty = calculate_eoq(demand["annual"], unit_cost=lt["unit_price"])
        max_qty = rop + order_qty
    elif reorder_model == "min_max":
        order_qty = demand["avg_daily"] * lt["avg_days"] * 2
        max_qty = rop + order_qty
    elif reorder_model == "periodic":
        review_interval = 7
        order_up_to = demand["avg_daily"] * (review_interval + lt["avg_days"]) + ss
        order_qty = order_up_to
        max_qty = order_up_to
    else:
        order_qty = calculate_eoq(demand["annual"], unit_cost=lt["unit_price"])
        max_qty = rop + order_qty

    return {
        "product_id": product_id,
        "service_level": service_level,
        "reorder_model": reorder_model,
        "safety_stock": round(ss, 1),
        "reorder_point": round(rop, 1),
        "order_quantity": round(order_qty, 1),
        "max_quantity": round(max_qty, 1),
        "demand_stats": demand,
        "lead_time_stats": {
            "avg_days": lt["avg_days"],
            "std_days": lt["std_days"],
            "primary_vendor": lt["vendor"],
        },
    }


def compare_all_reorder_rules(service_level: float = 0.95) -> list[dict]:
    """Compare calculated optimal rules vs current Odoo settings for all products."""
    rules = fetch_reorder_rules()
    inventory = fetch_inventory_snapshot()

    product_ids = set()
    if not rules.empty:
        product_ids.update(rules["product_id"].unique())
    if not inventory.empty:
        product_ids.update(inventory["product_id"].unique())

    results = []
    upsert_batch = []

    for pid in list(product_ids)[:100]:
        calc = calculate_reorder_rules_for_product(str(pid), service_level)
        if not calc:
            continue

        # Get current Odoo settings
        odoo_min = 0
        odoo_max = 0
        warehouse = ""
        if not rules.empty:
            prod_rules = rules[rules["product_id"] == str(pid)]
            if not prod_rules.empty:
                row = prod_rules.iloc[0]
                odoo_min = float(row.get("odoo_min_qty", 0))
                odoo_max = float(row.get("odoo_max_qty", 0))
                warehouse = str(row.get("warehouse_name", ""))

        on_hand = 0
        product_name = str(pid)
        if not inventory.empty:
            prod_inv = inventory[inventory["product_id"] == str(pid)]
            if not prod_inv.empty:
                on_hand = float(prod_inv["qty_available"].sum())
                product_name = str(prod_inv.iloc[0].get("product_name", pid))

        min_delta = calc["reorder_point"] - odoo_min
        max_delta = calc["max_quantity"] - odoo_max
        is_discrepant = abs(min_delta) > max(odoo_min * 0.2, 5) or abs(max_delta) > max(odoo_max * 0.2, 10)

        result = {
            **calc,
            "product_name": product_name,
            "warehouse_name": warehouse,
            "on_hand": round(on_hand, 1),
            "odoo_min_qty": odoo_min,
            "odoo_max_qty": odoo_max,
            "min_qty_delta": round(min_delta, 1),
            "max_qty_delta": round(max_delta, 1),
            "is_discrepant": is_discrepant,
            "is_below_rop": on_hand <= calc["reorder_point"],
            "urgency": "critical" if on_hand <= calc["safety_stock"] else "warning" if on_hand <= calc["reorder_point"] else "ok",
        }
        results.append(result)

        upsert_batch.append({
            "product_id": str(pid),
            "product_name": product_name,
            "warehouse_name": warehouse,
            "calc_safety_stock": calc["safety_stock"],
            "calc_reorder_point": calc["reorder_point"],
            "calc_eoq": calc["order_quantity"],
            "calc_max_qty": calc["max_quantity"],
            "service_level": service_level,
            "reorder_model": calc["reorder_model"],
            "min_qty_delta": round(min_delta, 1),
            "max_qty_delta": round(max_delta, 1),
            "is_discrepant": is_discrepant,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    if upsert_batch:
        upsert_reorder_rules(upsert_batch)

    results.sort(key=lambda r: (0 if r["urgency"] == "critical" else 1 if r["urgency"] == "warning" else 2, -r.get("on_hand", 0)))
    return results


def train() -> dict:
    """Validate data availability and compute initial rules."""
    rules = compare_all_reorder_rules()

    metrics = {
        "model_name": "reorder_engine",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "products_analyzed": len(rules),
        "discrepant_rules": sum(1 for r in rules if r.get("is_discrepant")),
        "critical_items": sum(1 for r in rules if r.get("urgency") == "critical"),
        "model_version": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
    }

    update_model_metadata(metrics)
    return metrics
