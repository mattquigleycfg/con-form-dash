"""Lost Opportunities analysis — CRM leads marked as lost.

Fetches archived crm.lead records from Odoo, enriches them with lost-reason,
pipeline stage, salesperson, and (where a linked Sale Order exists) a quote
breakdown by labour / freight / product with overinflation flags.
"""

import logging
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from app.models.installation_analysis import OdooRPC, extract_state

logger = logging.getLogger(__name__)

GP_THRESHOLD = 0.40
FREIGHT_DEFAULT_CODES = frozenset({"CF000412"})

STATE_VARIABLE_RATES: dict[str, float] = {
    "NSW": 1450.0,
    "QLD": 1365.0,
    "WA": 1550.0,
    "VIC": 2180.0,
    "SA": 2180.0,
    "TAS": 1450.0,
}


def _normalise_reason(raw: str) -> str:
    """Uniform title-case formatting for lost reasons."""
    s = raw.strip()
    if s.isupper() or s.islower():
        s = s.title()
    return s


class LostOpportunityAnalyser:
    def __init__(self) -> None:
        self.odoo = OdooRPC()
        self._install_ids: Optional[set[int]] = None
        self._freight_ids: Optional[set[int]] = None

    # ── Product discovery (for categorising SO lines) ─────────────────────

    def _discover_installation_product_ids(self) -> set[int]:
        if self._install_ids is not None:
            return self._install_ids
        ids: set[int] = set()
        ctx = {"active_test": False}
        tmpls = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "product.template", "search_read",
            [[["name", "ilike", "INSTALLATION"]]],
            {"fields": ["id", "name"], "limit": 200, "context": ctx},
        )
        tmpl_ids = [t["id"] for t in tmpls if (t.get("name") or "").strip().upper() == "INSTALLATION"]
        if tmpl_ids:
            variants = self.odoo.models.execute_kw(
                self.odoo.db, self.odoo.uid, self.odoo.password,
                "product.product", "search_read",
                [[["product_tmpl_id", "in", tmpl_ids]]],
                {"fields": ["id"], "limit": 500, "context": ctx},
            )
            ids.update(v["id"] for v in variants)
        prods = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "product.product", "search_read",
            [[["name", "ilike", "INSTALLATION"]]],
            {"fields": ["id", "name"], "limit": 500, "context": ctx},
        )
        for p in prods:
            if (p.get("name") or "").strip().upper() == "INSTALLATION":
                ids.add(p["id"])
        self._install_ids = ids
        logger.info("LostOpp: %d installation product IDs", len(ids))
        return ids

    def _discover_freight_product_ids(self) -> set[int]:
        if self._freight_ids is not None:
            return self._freight_ids
        ids: set[int] = set()
        ctx = {"active_test": False}
        for code in FREIGHT_DEFAULT_CODES:
            prods = self.odoo.models.execute_kw(
                self.odoo.db, self.odoo.uid, self.odoo.password,
                "product.product", "search_read",
                [[["default_code", "=", code]]],
                {"fields": ["id"], "limit": 50, "context": ctx},
            )
            ids.update(p["id"] for p in prods)
        prods = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "product.product", "search_read",
            [[["name", "ilike", "(INS) FREIGHT"]]],
            {"fields": ["id", "name"], "limit": 100, "context": ctx},
        )
        for p in prods:
            if "(INS) FREIGHT" in (p.get("name") or "").upper():
                ids.add(p["id"])
        self._freight_ids = ids
        logger.info("LostOpp: %d freight product IDs", len(ids))
        return ids

    # ── CRM data fetching ─────────────────────────────────────────────────

    def _fetch_lost_reasons(self) -> dict[int, str]:
        recs = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "crm.lost.reason", "search_read",
            [[]], {"fields": ["id", "name"], "limit": 500},
        )
        return {r["id"]: _normalise_reason(r.get("name") or "Unknown") for r in recs}

    def _fetch_stages(self) -> dict[int, str]:
        recs = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "crm.stage", "search_read",
            [[]], {"fields": ["id", "name"], "limit": 200},
        )
        return {r["id"]: (r.get("name") or "Unknown").strip() for r in recs}

    def _fetch_lost_leads(self) -> list[dict]:
        base_fields = [
            "id", "name", "partner_id", "user_id", "stage_id",
            "lost_reason_id", "expected_revenue", "date_closed",
            "active", "probability", "create_date",
        ]
        optional_fields = ["planned_revenue", "x_sale_order_type"]

        fields = base_fields + optional_fields
        for _ in range(len(optional_fields) + 1):
            try:
                recs = self.odoo.models.execute_kw(
                    self.odoo.db, self.odoo.uid, self.odoo.password,
                    "crm.lead", "search_read",
                    [[["active", "=", False], ["probability", "=", 0]]],
                    {"fields": fields, "limit": 5000,
                     "context": {"active_test": False}},
                )
                logger.info("LostOpp: fetched %d lost leads", len(recs))
                return recs
            except Exception as exc:
                removed = False
                for of in list(optional_fields):
                    if of in str(exc):
                        optional_fields.remove(of)
                        fields = base_fields + optional_fields
                        removed = True
                        break
                if not removed:
                    raise
        recs = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "crm.lead", "search_read",
            [[["active", "=", False], ["probability", "=", 0]]],
            {"fields": base_fields, "limit": 5000,
             "context": {"active_test": False}},
        )
        return recs

    def _fetch_won_leads(self, stages: dict[int, str]) -> list[dict]:
        """Fetch won opportunities for conversion rate calculation.
        Tries: (1) probability >= 90, (2) stage name contains 'won', (3) probability in 0-1 scale.
        """
        ctx = {"active_test": False}
        fields = ["id", "stage_id"]

        # 1. Primary: probability >= 90 (0-100 scale)
        try:
            recs = self.odoo.models.execute_kw(
                self.odoo.db, self.odoo.uid, self.odoo.password,
                "crm.lead", "search_read",
                [[["type", "=", "opportunity"], ["probability", ">=", 90]]],
                {"fields": fields, "limit": 10000, "context": ctx},
            )
            if recs:
                logger.info("LostOpp: fetched %d won leads (probability >= 90)", len(recs))
                return recs
        except Exception as exc:
            logger.warning("LostOpp: probability-based won fetch failed: %s", exc)

        # 2. Fallback: stages whose name contains "won"
        won_stage_ids = [sid for sid, name in stages.items() if "won" in (name or "").lower()]
        if won_stage_ids:
            try:
                recs = self.odoo.models.execute_kw(
                    self.odoo.db, self.odoo.uid, self.odoo.password,
                    "crm.lead", "search_read",
                    [[["type", "=", "opportunity"], ["stage_id", "in", won_stage_ids]]],
                    {"fields": fields, "limit": 10000, "context": ctx},
                )
                if recs:
                    logger.info("LostOpp: fetched %d won leads (by stage name)", len(recs))
                    return recs
            except Exception as exc:
                logger.warning("LostOpp: stage-based won fetch failed: %s", exc)

        # 3. Fallback: probability in 0-1 scale (1.0 = 100%)
        try:
            recs = self.odoo.models.execute_kw(
                self.odoo.db, self.odoo.uid, self.odoo.password,
                "crm.lead", "search_read",
                [[["type", "=", "opportunity"], ["probability", ">=", 0.9]]],
                {"fields": fields, "limit": 10000, "context": ctx},
            )
            if recs:
                logger.info("LostOpp: fetched %d won leads (probability 0-1 scale)", len(recs))
                return recs
        except Exception as exc:
            logger.warning("LostOpp: 0-1 probability won fetch failed: %s", exc)

        logger.info("LostOpp: no won leads found (0 conversion)")
        return []

    # ── Linked Sale Orders ────────────────────────────────────────────────

    def _fetch_linked_orders(self, lead_ids: list[int]) -> dict[int, list[dict]]:
        """Find sale.order records linked to lost leads via opportunity_id."""
        if not lead_ids:
            return {}
        so_fields = ["id", "name", "opportunity_id", "amount_total",
                      "amount_untaxed", "state"]
        optional = ["margin", "margin_percent"]
        fields = so_fields + optional
        for _ in range(len(optional) + 1):
            try:
                recs = self.odoo.search_read(
                    "sale.order",
                    [["opportunity_id", "in", lead_ids]],
                    fields,
                )
                break
            except Exception as exc:
                removed = False
                for of in list(optional):
                    if of in str(exc):
                        optional.remove(of)
                        fields = so_fields + optional
                        removed = True
                        break
                if not removed:
                    recs = []
                    break
        else:
            recs = []

        by_lead: dict[int, list[dict]] = defaultdict(list)
        for r in recs:
            opp = r.get("opportunity_id")
            lid = opp[0] if isinstance(opp, (list, tuple)) else opp
            if lid:
                by_lead[int(lid)].append(r)
        logger.info("LostOpp: found %d SOs linked to %d leads",
                     len(recs), len(by_lead))
        return dict(by_lead)

    def _fetch_so_lines(self, so_ids: list[int]) -> dict[int, list[dict]]:
        if not so_ids:
            return {}
        base_fields = ["order_id", "product_id", "product_uom_qty",
                        "price_unit", "price_subtotal", "name"]
        optional = ["purchase_price"]
        fields = base_fields + optional
        for _ in range(len(optional) + 1):
            try:
                recs = self.odoo.search_read(
                    "sale.order.line",
                    [["order_id", "in", so_ids]],
                    fields,
                )
                break
            except Exception as exc:
                removed = False
                for of in list(optional):
                    if of in str(exc):
                        optional.remove(of)
                        fields = base_fields + optional
                        removed = True
                        break
                if not removed:
                    recs = []
                    break
        else:
            recs = []

        by_so: dict[int, list[dict]] = defaultdict(list)
        for ln in recs:
            oid = ln["order_id"]
            so_id = oid[0] if isinstance(oid, (list, tuple)) else oid
            by_so[int(so_id)].append(ln)
        return dict(by_so)

    # ── Quote breakdown helpers ───────────────────────────────────────────

    def _categorise_line(self, ln: dict) -> str:
        pid = ln.get("product_id")
        pid_int = pid[0] if isinstance(pid, (list, tuple)) else pid
        if isinstance(pid_int, int):
            if pid_int in (self._install_ids or set()):
                return "labour"
            if pid_int in (self._freight_ids or set()):
                return "freight"
        return "product"

    def _extract_state_from_lines(self, lines: list[dict]) -> Optional[str]:
        for ln in lines:
            s = extract_state(ln.get("name") or "")
            if s:
                return s
        return None

    def _flag_overinflation(
        self, labour: float, freight: float, margin_pct: float,
        state: Optional[str], labour_qty: float,
    ) -> list[str]:
        flags: list[str] = []
        if margin_pct > GP_THRESHOLD * 100:
            flags.append("high_gp")
        if state and labour_qty > 0:
            bench = STATE_VARIABLE_RATES.get(state)
            if bench and labour > 0:
                quoted_rate = labour / labour_qty
                if quoted_rate > bench * 1.25:
                    flags.append("high_labour")
        if freight > 2500:
            flags.append("high_freight")
        return flags

    # ── Core analysis ─────────────────────────────────────────────────────

    def analyze(self) -> dict[str, Any]:
        install_ids = self._discover_installation_product_ids()
        freight_ids = self._discover_freight_product_ids()

        lost_reasons = self._fetch_lost_reasons()
        stages = self._fetch_stages()
        leads = self._fetch_lost_leads()
        won_leads = self._fetch_won_leads(stages)

        if not leads:
            return self._empty_result()

        # Build won counts by stage
        won_by_stage: dict[str, int] = defaultdict(int)
        for w in won_leads:
            stg = w.get("stage_id")
            stage_name = ""
            if isinstance(stg, (list, tuple)) and stg:
                stage_name = stages.get(int(stg[0]), str(stg[1]) if len(stg) > 1 else "Unknown")
            elif isinstance(stg, int):
                stage_name = stages.get(stg, "Unknown")
            if stage_name:
                won_by_stage[stage_name] += 1

        def is_tender_stage(name: str) -> bool:
            return "tender" in (name or "").lower()

        lead_ids = [l["id"] for l in leads]
        linked_sos = self._fetch_linked_orders(lead_ids)

        all_so_ids = [so["id"] for sos in linked_sos.values() for so in sos]
        so_lines_map = self._fetch_so_lines(all_so_ids)
        logger.info("LostOpp: fetched lines for %d SOs", len(so_lines_map))

        rows: list[dict] = []
        reason_counts: dict[str, int] = defaultdict(int)
        reason_values: dict[str, float] = defaultdict(float)
        stage_counts: dict[str, int] = defaultdict(int)
        stage_values: dict[str, float] = defaultdict(float)
        sp_counts: dict[str, int] = defaultdict(int)
        sp_values: dict[str, float] = defaultdict(float)
        flags_breakdown: dict[str, int] = defaultdict(int)
        total_value = 0.0
        total_with_quote = 0
        total_flagged = 0

        for lead in leads:
            lid = lead["id"]
            name = (lead.get("name") or "").strip()

            partner = lead.get("partner_id")
            customer = str(partner[1]) if isinstance(partner, (list, tuple)) else ""

            user = lead.get("user_id")
            salesperson = str(user[1]) if isinstance(user, (list, tuple)) else "Unassigned"

            stg = lead.get("stage_id")
            stage_name = ""
            if isinstance(stg, (list, tuple)):
                stage_name = stages.get(int(stg[0]), str(stg[1]))
            elif isinstance(stg, int):
                stage_name = stages.get(stg, "Unknown")

            lr = lead.get("lost_reason_id")
            reason = ""
            if isinstance(lr, (list, tuple)) and lr:
                reason = lost_reasons.get(int(lr[0]), _normalise_reason(str(lr[1])))
            elif isinstance(lr, int) and lr:
                reason = lost_reasons.get(lr, "Unknown")
            if not reason:
                reason = "Not Specified"

            revenue = lead.get("planned_revenue") or lead.get("expected_revenue") or 0
            if not isinstance(revenue, (int, float)):
                revenue = 0
            revenue = float(revenue)

            date_lost = lead.get("date_closed") or lead.get("create_date") or ""
            if isinstance(date_lost, str) and len(date_lost) > 10:
                date_lost = date_lost[:10]

            # Quote breakdown
            sos = linked_sos.get(lid, [])
            has_quote = len(sos) > 0
            quote_total = 0.0
            quote_labour = 0.0
            quote_freight = 0.0
            quote_product = 0.0
            labour_qty = 0.0
            margin_pct = 0.0
            quote_state: Optional[str] = None
            flags: list[str] = []

            if has_quote:
                total_with_quote += 1
                for so in sos:
                    qt = so.get("amount_untaxed") or so.get("amount_total") or 0
                    quote_total += float(qt)
                    mp = so.get("margin_percent")
                    if isinstance(mp, (int, float)):
                        margin_pct = float(mp)
                        # Odoo may return 0-1 (e.g. 0.35 for 35%) vs 0-100; normalize to 0-100
                        if 0 < margin_pct <= 1.5:
                            margin_pct *= 100

                    so_id = so["id"]
                    lines = so_lines_map.get(so_id, [])
                    for ln in lines:
                        cat = self._categorise_line(ln)
                        sub = float(ln.get("price_subtotal") or 0)
                        if cat == "labour":
                            quote_labour += sub
                            labour_qty += float(ln.get("product_uom_qty") or 0)
                        elif cat == "freight":
                            quote_freight += sub
                        else:
                            quote_product += sub

                    if not quote_state:
                        quote_state = self._extract_state_from_lines(lines)

                if quote_total > 0 and margin_pct == 0:
                    # Fallback when Odoo does not provide margin_percent: assume 65% cost ratio
                    cost_est = quote_total * 0.65
                    margin_pct = ((quote_total - cost_est) / quote_total) * 100

                flags = self._flag_overinflation(
                    quote_labour, quote_freight, margin_pct,
                    quote_state, labour_qty,
                )
                if flags:
                    total_flagged += 1
                    for f in flags:
                        flags_breakdown[f] += 1

            if revenue == 0 and quote_total > 0:
                revenue = quote_total

            total_value += revenue

            reason_counts[reason] += 1
            reason_values[reason] += revenue
            stage_counts[stage_name] += 1
            stage_values[stage_name] += revenue
            sp_counts[salesperson] += 1
            sp_values[salesperson] += revenue

            rows.append({
                "id": lid,
                "name": name,
                "customer": customer,
                "salesperson": salesperson,
                "stage": stage_name,
                "lost_reason": reason,
                "revenue": round(revenue, 2),
                "date_lost": date_lost,
                "has_quote": has_quote,
                "quote_total": round(quote_total, 2),
                "quote_labour": round(quote_labour, 2),
                "quote_freight": round(quote_freight, 2),
                "quote_product": round(quote_product, 2),
                "labour_qty": round(labour_qty, 1),
                "margin_pct": round(margin_pct, 1),
                "quote_state": quote_state,
                "flags": flags,
            })

        by_reason = [
            {"reason": r, "count": reason_counts[r],
             "value": round(reason_values[r], 2)}
            for r in sorted(reason_counts, key=lambda x: -reason_counts[x])
        ]
        by_stage = [
            {"stage": s, "count": stage_counts[s],
             "value": round(stage_values[s], 2)}
            for s in sorted(stage_counts, key=lambda x: -stage_counts[x])
        ]
        by_salesperson = [
            {"salesperson": sp, "count": sp_counts[sp],
             "value": round(sp_values[sp], 2)}
            for sp in sorted(sp_counts, key=lambda x: -sp_values[x])
        ]

        salespersons = sorted(sp_counts.keys())
        all_reasons = sorted(reason_counts.keys())
        all_stages = sorted(stage_counts.keys())

        total_won = sum(won_by_stage.values())
        total_resolved = total_won + len(rows)
        conversion_rate = (total_won / total_resolved * 100) if total_resolved else 0.0

        won_excl = sum(n for s, n in won_by_stage.items() if not is_tender_stage(s))
        lost_excl = len([r for r in rows if not is_tender_stage(r.get("stage", ""))])
        total_excl = won_excl + lost_excl
        conversion_rate_excl_tender = (won_excl / total_excl * 100) if total_excl else conversion_rate

        all_stage_names = sorted(set(stage_counts.keys()) | set(won_by_stage.keys()))
        by_stage_success = [
            {
                "stage": s,
                "won_count": won_by_stage.get(s, 0),
                "lost_count": stage_counts.get(s, 0),
                "success_rate": round(
                    (won_by_stage.get(s, 0) / (won_by_stage.get(s, 0) + stage_counts.get(s, 0)) * 100)
                    if (won_by_stage.get(s, 0) + stage_counts.get(s, 0)) else 0.0,
                    1,
                ),
            }
            for s in all_stage_names
            if won_by_stage.get(s, 0) + stage_counts.get(s, 0) > 0
        ]
        by_stage_success.sort(key=lambda x: -(x["won_count"] + x["lost_count"]))

        summary = {
            "total_lost": len(rows),
            "total_value": round(total_value, 2),
            "avg_deal_size": round(total_value / len(rows), 2) if rows else 0,
            "with_quotes": total_with_quote,
            "flagged_overinflated": total_flagged,
            "flags_breakdown": dict(flags_breakdown),
            "top_reason": by_reason[0]["reason"] if by_reason else "",
            "top_reason_count": by_reason[0]["count"] if by_reason else 0,
            "gp_threshold": GP_THRESHOLD,
            "won_count": total_won,
            "conversion_rate": round(conversion_rate, 1),
            "conversion_rate_excl_tender": round(conversion_rate_excl_tender, 1),
            "by_stage_success": by_stage_success,
        }

        return {
            "leads": sorted(rows, key=lambda r: -r["revenue"]),
            "summary": summary,
            "by_reason": by_reason,
            "by_stage": by_stage,
            "by_salesperson": by_salesperson,
            "filter_options": {
                "salespersons": salespersons,
                "reasons": all_reasons,
                "stages": all_stages,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _empty_result(self) -> dict[str, Any]:
        return {
            "leads": [],
            "summary": {
                "total_lost": 0, "total_value": 0, "avg_deal_size": 0,
                "with_quotes": 0, "flagged_overinflated": 0,
                "flags_breakdown": {},
                "top_reason": "", "top_reason_count": 0,
                "gp_threshold": GP_THRESHOLD,
                "won_count": 0,
                "conversion_rate": 0.0,
                "conversion_rate_excl_tender": 0.0,
                "by_stage_success": [],
            },
            "by_reason": [],
            "by_stage": [],
            "by_salesperson": [],
            "filter_options": {"salespersons": [], "reasons": [], "stages": []},
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }


_cache: dict[str, Any] = {}


def analyze(force_refresh: bool = False) -> dict[str, Any]:
    if not force_refresh and "result" in _cache:
        cached_at = _cache.get("cached_at", "")
        if cached_at:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(cached_at)).total_seconds() / 60
            if age < 30:
                logger.info("Returning cached lost-opp analysis (%.1f min old)", age)
                return _cache["result"]

    logger.info("Running fresh lost-opportunities analysis…")
    result = LostOpportunityAnalyser().analyze()
    _cache["result"] = result
    _cache["cached_at"] = datetime.now(timezone.utc).isoformat()
    return result
