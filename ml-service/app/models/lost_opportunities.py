"""Lost opportunities analysis module.

For each project SO matched to POs, calculates a full cost breakdown
(labour, freight, product/materials) and gross profit.  Orders with
GP > 40% are flagged as potential over-estimates — money left on the
table that could have been used for more competitive quoting.
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from app.models.installation_analysis import (
    OdooRPC,
    extract_analytic_id,
    extract_state,
    SO_TYPE_MAP,
    PRODUCT_TYPE_PATTERNS,
)

logger = logging.getLogger(__name__)

GP_THRESHOLD = 0.40

FREIGHT_DEFAULT_CODES = frozenset({"CF000412"})


class LostOpportunityAnalyser:
    def __init__(self) -> None:
        self.odoo = OdooRPC()
        self._analytic_field: Optional[str] = None

    # ── Analytic field detection ──────────────────────────────────────────

    def _detect_analytic_field(self) -> str:
        if self._analytic_field:
            return self._analytic_field
        valid: list[str] = []
        for c in ("analytic_account_id", "analytic_distribution"):
            try:
                self.odoo.models.execute_kw(
                    self.odoo.db, self.odoo.uid, self.odoo.password,
                    "sale.order.line", "search_read",
                    [[]], {"fields": [c], "limit": 1},
                )
                valid.append(c)
            except Exception:
                pass
        if len(valid) == 1:
            self._analytic_field = valid[0]
        elif len(valid) > 1:
            for vf in valid:
                rows = self.odoo.models.execute_kw(
                    self.odoo.db, self.odoo.uid, self.odoo.password,
                    "sale.order.line", "search_read",
                    [[]], {"fields": [vf], "limit": 50},
                )
                if any(bool(r.get(vf)) for r in (rows or [])):
                    self._analytic_field = vf
                    break
            if not self._analytic_field:
                self._analytic_field = valid[0]
        else:
            self._analytic_field = "analytic_distribution"
        logger.info("LostOpp: using analytic field: %s", self._analytic_field)
        return self._analytic_field

    # ── Product discovery ─────────────────────────────────────────────────

    def _discover_installation_product_ids(self) -> set[int]:
        ids: set[int] = set()
        ctx = {"active_test": False}
        templates = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "product.template", "search_read",
            [[["name", "ilike", "INSTALLATION"]]],
            {"fields": ["id", "name"], "limit": 200, "context": ctx},
        )
        tmpl_ids = [t["id"] for t in templates if t.get("name", "").strip().upper() == "INSTALLATION"]
        if tmpl_ids:
            variants = self.odoo.models.execute_kw(
                self.odoo.db, self.odoo.uid, self.odoo.password,
                "product.product", "search_read",
                [[["product_tmpl_id", "in", tmpl_ids]]],
                {"fields": ["id"], "limit": 500, "context": ctx},
            )
            ids.update(v["id"] for v in variants)
        products = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "product.product", "search_read",
            [[["name", "ilike", "INSTALLATION"]]],
            {"fields": ["id", "name"], "limit": 500, "context": ctx},
        )
        for p in products:
            if (p.get("name") or "").strip().upper() == "INSTALLATION":
                ids.add(p["id"])
        logger.info("LostOpp: %d installation product IDs", len(ids))
        return ids

    def _discover_freight_product_ids(self) -> set[int]:
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
            if (p.get("name") or "").strip().upper() == "(INS) FREIGHT":
                ids.add(p["id"])
        logger.info("LostOpp: %d freight product IDs", len(ids))
        return ids

    # ── Data fetching ─────────────────────────────────────────────────────

    def _fetch_so_marker_lines(self, product_ids: list[int]) -> list[dict]:
        """Fetch SO lines for installation/freight products to identify
        project SOs worth analysing."""
        if not product_ids:
            return []
        return self.odoo.search_read(
            "sale.order.line",
            [["product_id", "in", product_ids],
             ["order_id.state", "in", ["sale", "done"]]],
            ["order_id"],
        )

    def _fetch_all_so_lines(self, order_ids: list[int]) -> list[dict]:
        if not order_ids:
            return []
        return self.odoo.search_read(
            "sale.order.line",
            [["order_id", "in", order_ids]],
            ["order_id", "product_id", "product_uom_qty",
             "price_unit", "price_subtotal", "name"],
        )

    def _fetch_so_headers(self, order_ids: list[int]) -> dict[int, dict]:
        if not order_ids:
            return {}
        base = ["id", "name", "partner_id"]
        opt = ["x_sale_order_type", "analytic_account_id", "project_name"]
        fields = base + opt
        for _ in range(len(opt) + 1):
            try:
                recs = self.odoo.search_read("sale.order", [["id", "in", order_ids]], fields)
                return {r["id"]: r for r in recs}
            except Exception as exc:
                removed = None
                for o in list(opt):
                    if o in str(exc):
                        opt.remove(o)
                        removed = o
                        break
                if removed:
                    fields = base + opt
                else:
                    raise
        recs = self.odoo.search_read("sale.order", [["id", "in", order_ids]], base)
        return {r["id"]: r for r in recs}

    def _fetch_po_headers(self, po_ids: list[int]) -> dict[int, dict]:
        if not po_ids:
            return {}
        try:
            recs = self.odoo.search_read(
                "purchase.order", [["id", "in", po_ids]], ["id", "name", "project_id"],
            )
        except Exception:
            return {}
        return {r["id"]: r for r in recs}

    def _resolve_project_analytics(self, pids: list[int]) -> dict[int, int]:
        if not pids:
            return {}
        try:
            recs = self.odoo.search_read(
                "project.project", [["id", "in", pids]], ["id", "analytic_account_id"],
            )
            out = {}
            for r in recs:
                aa = r.get("analytic_account_id")
                if isinstance(aa, (list, tuple)):
                    out[r["id"]] = int(aa[0])
                elif isinstance(aa, (int, float)) and aa:
                    out[r["id"]] = int(aa)
            return out
        except Exception:
            return {}

    def _fetch_all_po_lines(self, po_order_ids: list[int]) -> list[dict]:
        """Fetch ALL lines on given PO orders (every cost category)."""
        if not po_order_ids:
            return []
        return self.odoo.search_read(
            "purchase.order.line",
            [["order_id", "in", po_order_ids]],
            ["order_id", "product_id", "product_qty",
             "price_unit", "price_subtotal", "name", "partner_id"],
        )

    # ── Classification ────────────────────────────────────────────────────

    def _classify_order(self, hdr: dict, sibs: list[dict]) -> list[str]:
        types: set[str] = set()
        so_type = hdr.get("x_sale_order_type")
        if so_type and so_type in SO_TYPE_MAP:
            types.add(SO_TYPE_MAP[so_type])
        elif isinstance(so_type, str):
            for key, mapped in SO_TYPE_MAP.items():
                if key.lower() in so_type.lower():
                    types.add(mapped)
        if not types:
            for ln in sibs:
                pn = ""
                if isinstance(ln.get("product_id"), (list, tuple)):
                    pn = str(ln["product_id"][1])
                combined = f"{pn} {ln.get('name', '')}"
                for ptype, pat in PRODUCT_TYPE_PATTERNS.items():
                    if pat.search(combined):
                        types.add(ptype)
        return sorted(types) if types else ["Unclassified"]

    def _extract_state(self, sibs: list[dict]) -> Optional[str]:
        for ln in sibs:
            s = extract_state(ln.get("name", "") or "")
            if s:
                return s
        return None

    # ── Core analysis ─────────────────────────────────────────────────────

    def analyze(self) -> dict[str, Any]:
        af = self._detect_analytic_field()

        install_ids = self._discover_installation_product_ids()
        freight_ids = self._discover_freight_product_ids()
        all_marker_ids = sorted(install_ids | freight_ids)

        marker_lines = self._fetch_so_marker_lines(all_marker_ids)
        so_order_ids = sorted({
            (ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple))
             else ln["order_id"])
            for ln in marker_lines
        })
        logger.info("LostOpp: %d SOs have installation/freight lines", len(so_order_ids))

        if not so_order_ids:
            return self._empty_result(af)

        so_headers = self._fetch_so_headers(so_order_ids)
        all_so_lines = self._fetch_all_so_lines(so_order_ids)
        logger.info("LostOpp: fetched %d total SO lines", len(all_so_lines))

        so_lines_by_order: dict[int, list[dict]] = defaultdict(list)
        for ln in all_so_lines:
            oid = ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"]
            so_lines_by_order[oid].append(ln)

        # ── Build SO analytic index ──────────────────────────────────────
        so_analytic_map: dict[int, int] = {}
        so_project_name_map: dict[int, str] = {}
        for oid in so_order_ids:
            hdr = so_headers.get(oid, {})
            aid = extract_analytic_id(hdr, "analytic_account_id")
            if aid:
                so_analytic_map[oid] = aid
            pn = (hdr.get("project_name") or "").strip()
            if pn:
                so_project_name_map[oid] = pn

        analytic_to_so: dict[int, int] = {v: k for k, v in so_analytic_map.items()}

        # ── Get ALL POs and resolve to analytic accounts ─────────────────
        all_po_headers_raw = self.odoo.search_read(
            "purchase.order",
            [["state", "in", ["purchase", "done"]]],
            ["id", "name", "project_id"],
        )
        all_po_headers = {r["id"]: r for r in all_po_headers_raw}
        logger.info("LostOpp: fetched %d PO headers", len(all_po_headers))

        project_ids: list[int] = []
        for ph in all_po_headers.values():
            pid = ph.get("project_id")
            if isinstance(pid, (list, tuple)):
                project_ids.append(int(pid[0]))
            elif isinstance(pid, (int, float)) and pid:
                project_ids.append(int(pid))
        proj_to_analytic = self._resolve_project_analytics(list(set(project_ids)))

        # Map PO order → analytic account
        po_analytic_map: dict[int, int] = {}
        po_project_name_map: dict[int, str] = {}
        for po_id, ph in all_po_headers.items():
            pid = ph.get("project_id")
            if isinstance(pid, (list, tuple)):
                aa = proj_to_analytic.get(int(pid[0]))
                if aa:
                    po_analytic_map[po_id] = aa
                po_project_name_map[po_id] = str(pid[1]).strip().upper() if len(pid) > 1 else ""
            elif isinstance(pid, (int, float)) and pid:
                aa = proj_to_analytic.get(int(pid))
                if aa:
                    po_analytic_map[po_id] = aa

        # Match: find PO orders whose analytic links to an SO
        target_analytics = set(so_analytic_map.values())
        matched_po_ids_by_analytic: dict[int, list[int]] = defaultdict(list)
        for po_id, aa in po_analytic_map.items():
            if aa in target_analytics:
                matched_po_ids_by_analytic[aa].append(po_id)

        # Project-name fallback index
        pn_to_po_ids: dict[str, list[int]] = defaultdict(list)
        for po_id, pname in po_project_name_map.items():
            if pname:
                pn_to_po_ids[pname].append(po_id)

        # Collect all PO order IDs we need lines for
        all_matched_po_ids: set[int] = set()
        for po_list in matched_po_ids_by_analytic.values():
            all_matched_po_ids.update(po_list)
        for so_oid, pn in so_project_name_map.items():
            if so_oid not in so_analytic_map or so_analytic_map[so_oid] not in matched_po_ids_by_analytic:
                for pid in pn_to_po_ids.get(pn.upper(), []):
                    all_matched_po_ids.add(pid)

        logger.info("LostOpp: %d matched PO orders to fetch lines for", len(all_matched_po_ids))
        all_po_lines = self._fetch_all_po_lines(sorted(all_matched_po_ids))
        logger.info("LostOpp: fetched %d total PO lines", len(all_po_lines))

        # Group PO lines by analytic account
        po_lines_by_analytic: dict[int, list[dict]] = defaultdict(list)
        po_lines_by_po_id: dict[int, list[dict]] = defaultdict(list)
        for ln in all_po_lines:
            po_oid = ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"]
            po_lines_by_po_id[po_oid].append(ln)
            aa = po_analytic_map.get(po_oid)
            if aa:
                po_lines_by_analytic[aa].append(ln)

        # Project name → PO lines
        pn_to_po_lines: dict[str, list[dict]] = defaultdict(list)
        for po_id, pname in po_project_name_map.items():
            if pname and po_id in po_lines_by_po_id:
                pn_to_po_lines[pname].extend(po_lines_by_po_id[po_id])

        # ── Build order-level summaries ──────────────────────────────────
        rows: list[dict] = []
        by_type: dict[str, dict] = defaultdict(lambda: {
            "count": 0, "revenue": 0.0, "cogs": 0.0,
            "labour": 0.0, "freight": 0.0, "product": 0.0,
        })
        by_state: dict[str, dict] = defaultdict(lambda: {
            "count": 0, "revenue": 0.0, "cogs": 0.0,
        })

        for so_oid in so_order_ids:
            hdr = so_headers.get(so_oid, {})
            sibs = so_lines_by_order.get(so_oid, [])
            customer = ""
            if isinstance(hdr.get("partner_id"), (list, tuple)):
                customer = str(hdr["partner_id"][1])
            types = self._classify_order(hdr, sibs)
            state = self._extract_state(sibs)

            revenue = sum((ln.get("price_subtotal", 0) or 0) for ln in sibs)
            if revenue <= 0:
                continue

            # Find matched PO lines
            aid = so_analytic_map.get(so_oid)
            matched_po_lns = po_lines_by_analytic.get(aid, []) if aid else []
            match_method = "analytic" if matched_po_lns else None

            if not matched_po_lns:
                pn = so_project_name_map.get(so_oid, "").upper()
                if pn:
                    matched_po_lns = pn_to_po_lines.get(pn, [])
                    if matched_po_lns:
                        match_method = "project_name"

            if not matched_po_lns:
                continue

            # Categorise PO costs
            labour_cost = 0.0
            freight_cost = 0.0
            product_cost = 0.0
            for pl in matched_po_lns:
                cost = pl.get("price_subtotal", 0) or 0
                pid = pl.get("product_id")
                pid_int = pid[0] if isinstance(pid, (list, tuple)) else pid
                if isinstance(pid_int, int):
                    if pid_int in install_ids:
                        labour_cost += cost
                    elif pid_int in freight_ids:
                        freight_cost += cost
                    else:
                        product_cost += cost
                else:
                    product_cost += cost

            total_cogs = labour_cost + freight_cost + product_cost
            gp = (revenue - total_cogs) / revenue if revenue > 0 else 0
            excess_above_threshold = max(0, (gp - GP_THRESHOLD) * revenue) if gp > GP_THRESHOLD else 0

            row = {
                "so_ref": hdr.get("name", ""),
                "customer": customer,
                "product_types": types,
                "state": state,
                "revenue": round(revenue, 2),
                "cogs_labour": round(labour_cost, 2),
                "cogs_freight": round(freight_cost, 2),
                "cogs_product": round(product_cost, 2),
                "total_cogs": round(total_cogs, 2),
                "gp": round(gp, 3),
                "gp_pct": round(gp * 100, 1),
                "is_over_estimate": gp > GP_THRESHOLD,
                "excess_value": round(excess_above_threshold, 2),
                "match_method": match_method,
            }
            rows.append(row)

            for t in types:
                bt = by_type[t]
                bt["count"] += 1
                bt["revenue"] += revenue
                bt["cogs"] += total_cogs
                bt["labour"] += labour_cost
                bt["freight"] += freight_cost
                bt["product"] += product_cost
            if state:
                bs = by_state[state]
                bs["count"] += 1
                bs["revenue"] += revenue
                bs["cogs"] += total_cogs

        # ── Summary ──────────────────────────────────────────────────────
        total_rev = sum(r["revenue"] for r in rows)
        total_cogs_all = sum(r["total_cogs"] for r in rows)
        over_est_rows = [r for r in rows if r["is_over_estimate"]]

        summary = {
            "total_orders_analysed": len(rows),
            "total_revenue": round(total_rev, 2),
            "total_cogs": round(total_cogs_all, 2),
            "overall_gp": round((total_rev - total_cogs_all) / total_rev, 3) if total_rev else 0,
            "orders_above_threshold": len(over_est_rows),
            "pct_above_threshold": round(len(over_est_rows) / len(rows), 3) if rows else 0,
            "total_excess_value": round(sum(r["excess_value"] for r in over_est_rows), 2),
            "total_labour_cost": round(sum(r["cogs_labour"] for r in rows), 2),
            "total_freight_cost": round(sum(r["cogs_freight"] for r in rows), 2),
            "total_product_cost": round(sum(r["cogs_product"] for r in rows), 2),
            "gp_threshold": GP_THRESHOLD,
            "by_product_type": {
                t: {
                    "count": d["count"],
                    "revenue": round(d["revenue"], 2),
                    "cogs": round(d["cogs"], 2),
                    "gp": round((d["revenue"] - d["cogs"]) / d["revenue"], 3) if d["revenue"] else 0,
                    "labour": round(d["labour"], 2),
                    "freight": round(d["freight"], 2),
                    "product": round(d["product"], 2),
                }
                for t, d in sorted(by_type.items())
            },
            "by_state": {
                s: {
                    "count": d["count"],
                    "revenue": round(d["revenue"], 2),
                    "cogs": round(d["cogs"], 2),
                    "gp": round((d["revenue"] - d["cogs"]) / d["revenue"], 3) if d["revenue"] else 0,
                }
                for s, d in sorted(by_state.items())
            },
        }

        return {
            "orders": sorted(rows, key=lambda r: -r["gp"]),
            "summary": summary,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "analytic_field_used": af,
        }

    def _empty_result(self, af: str) -> dict[str, Any]:
        return {
            "orders": [],
            "summary": {
                "total_orders_analysed": 0, "total_revenue": 0, "total_cogs": 0,
                "overall_gp": 0, "orders_above_threshold": 0,
                "pct_above_threshold": 0, "total_excess_value": 0,
                "total_labour_cost": 0, "total_freight_cost": 0,
                "total_product_cost": 0, "gp_threshold": GP_THRESHOLD,
                "by_product_type": {}, "by_state": {},
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "analytic_field_used": af,
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

    logger.info("Running fresh lost-opportunities analysis...")
    result = LostOpportunityAnalyser().analyze()
    _cache["result"] = result
    _cache["cached_at"] = datetime.now(timezone.utc).isoformat()
    return result
