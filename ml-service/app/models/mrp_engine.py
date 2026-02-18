"""MRP netting engine: BOM explosion, net requirements, time-phased planning.

Calculates gross requirements (independent + dependent demand), scheduled
receipts, and planned order releases on a weekly time-phased grid.
"""

import numpy as np
import pandas as pd
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.data.pipeline import (
    fetch_demand_history,
    fetch_inventory_snapshot,
    fetch_po_delivery_history,
    fetch_production_history,
    fetch_supplier_product_metrics,
    fetch_reorder_rules,
    upsert_mrp_netting,
)
from app.models.demand import forecast_product

logger = logging.getLogger(__name__)


def _get_bom_structure() -> dict[str, list[dict]]:
    """Fetch BOM structures via Supabase (job_bom_lines table).

    Returns mapping of parent_product -> list of {product_id, qty_per}.
    In practice this would query mrp.bom.line via Odoo; here we use
    what's already synced into job_bom_lines as a proxy.
    """
    from app.data.pipeline import get_supabase_client
    client = get_supabase_client()
    try:
        resp = client.table("job_bom_lines").select("*").execute()
        if not resp.data:
            return {}
    except Exception:
        return {}

    bom_map: dict[str, list[dict]] = {}
    for row in resp.data:
        parent = str(row.get("product_name", ""))
        component = str(row.get("component_name", row.get("product_name", "")))
        qty = float(row.get("quantity", 0))
        if parent and component and qty > 0:
            if parent not in bom_map:
                bom_map[parent] = []
            bom_map[parent].append({"product_name": component, "qty_per": qty})
    return bom_map


def explode_bom(product_name: str, qty: float,
                bom_map: Optional[dict] = None,
                depth: int = 0) -> list[dict]:
    """Recursively explode a BOM to get all raw material requirements."""
    if bom_map is None:
        bom_map = _get_bom_structure()

    if depth > 10:
        return []

    components = bom_map.get(product_name, [])
    if not components:
        return [{"product_name": product_name, "qty_required": qty, "level": depth}]

    results = []
    for comp in components:
        child_qty = comp["qty_per"] * qty
        results.extend(explode_bom(comp["product_name"], child_qty, bom_map, depth + 1))

    return results


def _get_weekly_forecast(product_id: str, weeks: int = 12) -> list[float]:
    """Get weekly demand forecast for a product."""
    forecast = forecast_product(product_id, periods=max(3, weeks // 4))
    if not forecast or not forecast.get("forecast"):
        return [0.0] * weeks

    monthly_values = [f["predicted_quantity"] for f in forecast["forecast"]]
    weekly = []
    for monthly_qty in monthly_values:
        for _ in range(4):
            weekly.append(monthly_qty / 4.0)
            if len(weekly) >= weeks:
                break
        if len(weekly) >= weeks:
            break

    while len(weekly) < weeks:
        weekly.append(weekly[-1] if weekly else 0)

    return weekly[:weeks]


def calculate_net_requirements(product_id: str, weeks: int = 12) -> dict:
    """Calculate time-phased net requirements for a product.

    Net = Gross - On-hand - Scheduled Receipts + Safety Stock
    """
    inventory = fetch_inventory_snapshot()
    on_hand = 0.0
    product_name = product_id

    if not inventory.empty:
        prod_inv = inventory[inventory["product_id"] == product_id]
        if not prod_inv.empty:
            on_hand = float(prod_inv["qty_available"].sum())
            product_name = str(prod_inv.iloc[0].get("product_name", product_id))

    # Get scheduled receipts from open POs
    po_history = fetch_po_delivery_history()
    scheduled_receipts: dict[int, float] = {}
    if not po_history.empty:
        po_history["planned_date"] = pd.to_datetime(po_history["planned_date"], errors="coerce")
        open_pos = po_history[po_history["actual_date"].isna() & po_history["planned_date"].notna()]
        prod_pos = open_pos[open_pos.get("product_category", pd.Series(dtype=str)).str.contains(product_id[:10], na=False)]

        today = datetime.now(timezone.utc).date()
        for _, po in prod_pos.iterrows():
            planned = po["planned_date"].date() if hasattr(po["planned_date"], 'date') else po["planned_date"]
            week_offset = max(0, (planned - today).days // 7)
            if week_offset < weeks:
                scheduled_receipts[week_offset] = scheduled_receipts.get(week_offset, 0) + float(po.get("quantity", 0))

    # Get safety stock from reorder rules
    rules = fetch_reorder_rules()
    safety_stock = 0.0
    if not rules.empty:
        prod_rules = rules[rules["product_id"] == product_id]
        if not prod_rules.empty:
            safety_stock = float(prod_rules.iloc[0].get("calc_safety_stock", 0))

    weekly_demand = _get_weekly_forecast(product_id, weeks)
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())

    netting_rows = []
    projected = on_hand

    for w in range(weeks):
        week_start = monday + timedelta(weeks=w)
        gross = weekly_demand[w]
        receipts = scheduled_receipts.get(w, 0)
        projected = projected - gross + receipts

        net_req = max(0, safety_stock - projected)
        planned_release = net_req if net_req > 0 else 0

        netting_rows.append({
            "product_id": product_id,
            "product_name": product_name,
            "week_start": week_start.isoformat(),
            "gross_requirement": round(gross, 1),
            "scheduled_receipts": round(receipts, 1),
            "projected_on_hand": round(projected, 1),
            "net_requirement": round(net_req, 1),
            "planned_order_release": round(planned_release, 1),
            "demand_type": "independent",
        })

        if planned_release > 0:
            projected += planned_release

    return {
        "product_id": product_id,
        "product_name": product_name,
        "on_hand": round(on_hand, 1),
        "safety_stock": round(safety_stock, 1),
        "weeks": netting_rows,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def run_mrp_all(weeks: int = 12) -> list[dict]:
    """Run MRP netting for all products with inventory data."""
    inventory = fetch_inventory_snapshot()
    if inventory.empty:
        return []

    product_ids = inventory["product_id"].unique()
    results = []

    for pid in product_ids[:50]:
        try:
            result = calculate_net_requirements(str(pid), weeks)
            if result["weeks"]:
                results.append(result)
                upsert_mrp_netting([
                    {k: v for k, v in row.items() if k != "demand_type" or True}
                    for row in result["weeks"]
                ])
        except Exception as e:
            logger.warning(f"MRP netting failed for product {pid}: {e}")

    return results
