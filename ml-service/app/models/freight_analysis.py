"""Freight cost gap analysis module.

Compares SO (quoted) vs PO (actual) freight costs by matching
orders via analytic accounts and project names.  Freight is typically
lump-summed (qty=1, variable price) so the comparison is purely monetary.
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

FREIGHT_DEFAULT_CODES = {"CF000412"}


class FreightAnalyser:
    def __init__(self) -> None:
        self.odoo = OdooRPC()
        self._analytic_field: Optional[str] = None

    def _detect_analytic_field(self) -> str:
        if self._analytic_field:
            return self._analytic_field

        valid_fields: list[str] = []
        for candidate in ("analytic_account_id", "analytic_distribution"):
            try:
                self.odoo.models.execute_kw(
                    self.odoo.db, self.odoo.uid, self.odoo.password,
                    "sale.order.line", "search_read",
                    [[]], {"fields": [candidate], "limit": 1},
                )
                valid_fields.append(candidate)
            except Exception:
                pass

        if len(valid_fields) == 1:
            self._analytic_field = valid_fields[0]
        elif len(valid_fields) > 1:
            for vf in valid_fields:
                rows = self.odoo.models.execute_kw(
                    self.odoo.db, self.odoo.uid, self.odoo.password,
                    "sale.order.line", "search_read",
                    [[]], {"fields": [vf], "limit": 50},
                )
                if any(bool(r.get(vf)) for r in (rows or [])):
                    self._analytic_field = vf
                    break
            if not self._analytic_field:
                self._analytic_field = valid_fields[0]
        else:
            self._analytic_field = "analytic_distribution"

        logger.info("Freight: using analytic field: %s", self._analytic_field)
        return self._analytic_field

    # ── Product discovery ─────────────────────────────────────────────────

    def _discover_freight_product_ids(self) -> list[int]:
        if hasattr(self, "_freight_product_ids"):
            return self._freight_product_ids

        all_ids: set[int] = set()
        ctx = {"active_test": False}

        for code in FREIGHT_DEFAULT_CODES:
            products = self.odoo.models.execute_kw(
                self.odoo.db, self.odoo.uid, self.odoo.password,
                "product.product", "search_read",
                [[["default_code", "=", code]]],
                {"fields": ["id", "name", "default_code"], "limit": 50,
                 "context": ctx},
            )
            for p in products:
                all_ids.add(p["id"])

        products = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "product.product", "search_read",
            [[["name", "ilike", "(INS) FREIGHT"]]],
            {"fields": ["id", "name", "default_code"], "limit": 100,
             "context": ctx},
        )
        for p in products:
            pname = (p.get("name") or "").strip().upper()
            if pname == "(INS) FREIGHT":
                all_ids.add(p["id"])

        self._freight_product_ids = sorted(all_ids)
        logger.info(
            "Freight product IDs (total %d): %s",
            len(self._freight_product_ids), self._freight_product_ids,
        )
        return self._freight_product_ids

    # ── Data fetching ─────────────────────────────────────────────────────

    def _fetch_so_freight_lines(self) -> list[dict]:
        af = self._detect_analytic_field()
        fields = [
            "order_id", "product_id", "product_uom_qty",
            "price_unit", "price_subtotal", "name", af,
        ]
        product_ids = self._discover_freight_product_ids()
        if product_ids:
            domain = [
                ["product_id", "in", product_ids],
                ["order_id.state", "in", ["sale", "done"]],
            ]
        else:
            domain = [
                ["product_id.default_code", "in", list(FREIGHT_DEFAULT_CODES)],
                ["order_id.state", "in", ["sale", "done"]],
            ]
        lines = self.odoo.search_read("sale.order.line", domain, fields)
        logger.info("Fetched %d SO freight lines", len(lines))
        return lines

    def _fetch_po_freight_lines(self) -> list[dict]:
        af = self._detect_analytic_field()
        fields = [
            "order_id", "product_id", "product_qty",
            "price_unit", "price_subtotal", "name", "partner_id", af,
        ]
        product_ids = self._discover_freight_product_ids()
        if product_ids:
            domain = [
                ["product_id", "in", product_ids],
                ["order_id.state", "in", ["purchase", "done"]],
            ]
        else:
            domain = [
                ["product_id.default_code", "in", list(FREIGHT_DEFAULT_CODES)],
                ["order_id.state", "in", ["purchase", "done"]],
            ]
        lines = self.odoo.search_read("purchase.order.line", domain, fields)
        logger.info("Fetched %d PO freight lines", len(lines))
        return lines

    def _fetch_so_headers(self, order_ids: list[int]) -> dict[int, dict]:
        if not order_ids:
            return {}
        base_fields = ["id", "name", "partner_id"]
        optional = ["x_sale_order_type", "analytic_account_id", "project_name"]
        fields = base_fields + optional
        for _ in range(len(optional) + 1):
            try:
                records = self.odoo.search_read(
                    "sale.order", [["id", "in", order_ids]], fields,
                )
                return {r["id"]: r for r in records}
            except Exception as exc:
                err_msg = str(exc)
                removed = None
                for of in list(optional):
                    if of in err_msg:
                        optional.remove(of)
                        removed = of
                        break
                if removed:
                    fields = base_fields + optional
                else:
                    raise
        records = self.odoo.search_read(
            "sale.order", [["id", "in", order_ids]], base_fields,
        )
        return {r["id"]: r for r in records}

    def _fetch_po_headers(self, po_order_ids: list[int]) -> dict[int, dict]:
        if not po_order_ids:
            return {}
        try:
            records = self.odoo.search_read(
                "purchase.order",
                [["id", "in", po_order_ids]],
                ["id", "name", "project_id"],
            )
        except Exception:
            return {}
        return {r["id"]: r for r in records}

    def _resolve_project_analytic_accounts(
        self, project_ids: list[int],
    ) -> dict[int, int]:
        if not project_ids:
            return {}
        try:
            records = self.odoo.search_read(
                "project.project",
                [["id", "in", project_ids]],
                ["id", "analytic_account_id"],
            )
            result = {}
            for r in records:
                aa = r.get("analytic_account_id")
                if isinstance(aa, (list, tuple)):
                    result[r["id"]] = int(aa[0])
                elif isinstance(aa, (int, float)) and aa:
                    result[r["id"]] = int(aa)
            return result
        except Exception as exc:
            logger.warning("Could not resolve project analytic accounts: %s", exc)
            return {}

    def _fetch_sibling_lines(self, order_ids: list[int]) -> dict[int, list[dict]]:
        if not order_ids:
            return {}
        lines = self.odoo.search_read(
            "sale.order.line",
            [["order_id", "in", order_ids], ["product_uom_qty", ">", 0]],
            ["order_id", "name", "product_id", "product_uom_qty", "price_unit"],
        )
        grouped: dict[int, list[dict]] = defaultdict(list)
        for ln in lines:
            oid = ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"]
            grouped[oid].append(ln)
        return grouped

    # ── Classification ────────────────────────────────────────────────────

    def _classify_order(
        self, so_header: dict, sibling_lines: list[dict],
    ) -> list[str]:
        types: set[str] = set()
        so_type = so_header.get("x_sale_order_type")
        if so_type and so_type in SO_TYPE_MAP:
            types.add(SO_TYPE_MAP[so_type])
        elif isinstance(so_type, str):
            for key, mapped in SO_TYPE_MAP.items():
                if key.lower() in so_type.lower():
                    types.add(mapped)
        if not types:
            for ln in sibling_lines:
                prod_name = ""
                if isinstance(ln.get("product_id"), (list, tuple)):
                    prod_name = str(ln["product_id"][1])
                desc = ln.get("name", "") or ""
                combined = f"{prod_name} {desc}"
                if "FREIGHT" in combined.upper():
                    continue
                for ptype, pattern in PRODUCT_TYPE_PATTERNS.items():
                    if pattern.search(combined):
                        types.add(ptype)
        return sorted(types) if types else ["Unclassified"]

    def _extract_order_state(self, sibling_lines: list[dict]) -> Optional[str]:
        """Derive state from sibling INSTALLATION line descriptions."""
        for ln in sibling_lines:
            desc = ln.get("name", "") or ""
            state = extract_state(desc)
            if state:
                return state
        return None

    # ── Core analysis ─────────────────────────────────────────────────────

    def analyze(self) -> dict[str, Any]:
        af = self._detect_analytic_field()

        so_lines = self._fetch_so_freight_lines()
        po_lines = self._fetch_po_freight_lines()

        so_order_ids = list({
            (ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"])
            for ln in so_lines
        })
        so_headers = self._fetch_so_headers(so_order_ids)
        siblings = self._fetch_sibling_lines(so_order_ids)

        po_order_ids = list({
            (ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"])
            for ln in po_lines
        })
        po_headers = self._fetch_po_headers(po_order_ids)

        project_ids: list[int] = []
        for ph in po_headers.values():
            pid = ph.get("project_id")
            if isinstance(pid, (list, tuple)):
                project_ids.append(int(pid[0]))
            elif isinstance(pid, (int, float)) and pid:
                project_ids.append(int(pid))
        project_to_analytic = self._resolve_project_analytic_accounts(
            list(set(project_ids))
        )
        logger.info(
            "Freight PO project resolution: %d POs have project_id, "
            "%d resolved to analytic accounts",
            len(project_ids), len(project_to_analytic),
        )

        # ── Build PO analytic index ──────────────────────────────────────
        po_by_analytic: dict[int, list[dict]] = defaultdict(list)
        for ln in po_lines:
            aid = extract_analytic_id(ln, af)
            if not aid:
                po_oid = ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"]
                ph = po_headers.get(po_oid, {})
                pid = ph.get("project_id")
                if isinstance(pid, (list, tuple)):
                    aid = project_to_analytic.get(int(pid[0]))
                elif isinstance(pid, (int, float)) and pid:
                    aid = project_to_analytic.get(int(pid))
            if aid:
                po_by_analytic[aid].append(ln)

        # ── Build project name index ─────────────────────────────────────
        po_project_name_to_lines: dict[str, list[dict]] = defaultdict(list)
        for ln in po_lines:
            po_oid = ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"]
            ph = po_headers.get(po_oid, {})
            pid = ph.get("project_id")
            if isinstance(pid, (list, tuple)) and len(pid) > 1:
                pname = str(pid[1]).strip().upper()
                if pname:
                    po_project_name_to_lines[pname].append(ln)

        # ── Group SO freight by order ────────────────────────────────────
        order_groups: dict[int, dict] = {}
        for so_ln in so_lines:
            oid = so_ln["order_id"][0] if isinstance(so_ln["order_id"], (list, tuple)) else so_ln["order_id"]
            rev = so_ln.get("price_subtotal", 0) or 0
            if not rev:
                qty = so_ln.get("product_uom_qty", 0) or 0
                rate = so_ln.get("price_unit", 0) or 0
                rev = qty * rate

            line_aid = extract_analytic_id(so_ln, af)

            if oid not in order_groups:
                header = so_headers.get(oid, {})
                sibs = siblings.get(oid, [])
                customer = ""
                if isinstance(header.get("partner_id"), (list, tuple)):
                    customer = str(header["partner_id"][1])
                hdr_aid = extract_analytic_id(header, "analytic_account_id")
                proj_name = (header.get("project_name") or "").strip()
                state = self._extract_order_state(sibs)
                order_groups[oid] = {
                    "so_ref": header.get("name", ""),
                    "customer": customer,
                    "types": self._classify_order(header, sibs),
                    "total_freight": 0.0,
                    "line_count": 0,
                    "state": state,
                    "analytic_id": hdr_aid,
                    "project_name": proj_name,
                }

            grp = order_groups[oid]
            grp["total_freight"] += rev
            grp["line_count"] += 1
            if line_aid and not grp["analytic_id"]:
                grp["analytic_id"] = line_aid

        logger.info(
            "Grouped %d SO freight lines into %d orders",
            len(so_lines), len(order_groups),
        )

        # ── Vendor stats ─────────────────────────────────────────────────
        vendor_stats: dict[str, dict] = defaultdict(lambda: {
            "vendor": "",
            "po_count_set": set(),
            "total_cost": 0.0,
            "line_count": 0,
        })
        for ln in po_lines:
            vendor_name = ""
            if isinstance(ln.get("partner_id"), (list, tuple)):
                vendor_name = str(ln["partner_id"][1])
            if not vendor_name:
                continue
            po_ref = ""
            if isinstance(ln.get("order_id"), (list, tuple)):
                po_ref = str(ln["order_id"][0])
            cost = ln.get("price_subtotal", 0) or 0
            v = vendor_stats[vendor_name]
            v["vendor"] = vendor_name
            v["po_count_set"].add(po_ref)
            v["total_cost"] += cost
            v["line_count"] += 1

        # ── Match SO to PO ───────────────────────────────────────────────
        comparison_rows: list[dict] = []
        by_type: dict[str, dict] = defaultdict(lambda: {
            "so_total": 0.0, "po_total": 0.0, "matched_count": 0,
        })
        by_state: dict[str, dict] = defaultdict(lambda: {
            "so_total": 0.0, "po_total": 0.0, "matched_count": 0,
        })

        for oid, grp in order_groups.items():
            so_freight = grp["total_freight"]
            types = grp["types"]
            primary_state = grp["state"]

            aid = grp["analytic_id"]
            matched_po_lines = po_by_analytic.get(aid, []) if aid else []
            match_method = "analytic" if matched_po_lines else None

            if not matched_po_lines and grp["project_name"]:
                pn_upper = grp["project_name"].upper()
                matched_po_lines = po_project_name_to_lines.get(pn_upper, [])
                if matched_po_lines:
                    match_method = "project_name"

            if matched_po_lines:
                po_freight = sum(
                    (p.get("price_subtotal", 0) or 0) for p in matched_po_lines
                )
                po_refs = sorted(set(
                    str(p["order_id"][1]) for p in matched_po_lines
                    if isinstance(p.get("order_id"), (list, tuple))
                ))
                vendors = sorted(set(
                    str(p["partner_id"][1]) for p in matched_po_lines
                    if isinstance(p.get("partner_id"), (list, tuple))
                ))

                gap = so_freight - po_freight
                gap_pct = gap / so_freight if so_freight > 0 else None

                comparison_rows.append({
                    "so_ref": grp["so_ref"],
                    "customer": grp["customer"],
                    "product_types": types,
                    "state": primary_state,
                    "so_freight": round(so_freight, 2),
                    "po_freight": round(po_freight, 2),
                    "gap": round(gap, 2),
                    "gap_pct": round(gap_pct, 3) if gap_pct is not None else None,
                    "po_refs": po_refs,
                    "vendors": vendors,
                    "match_method": match_method,
                })

                for t in types:
                    by_type[t]["so_total"] += so_freight
                    by_type[t]["po_total"] += po_freight
                    by_type[t]["matched_count"] += 1
                if primary_state:
                    by_state[primary_state]["so_total"] += so_freight
                    by_state[primary_state]["po_total"] += po_freight
                    by_state[primary_state]["matched_count"] += 1

        # ── Summary ──────────────────────────────────────────────────────
        total_so = sum(r["so_freight"] for r in comparison_rows)
        total_po = sum(r["po_freight"] for r in comparison_rows)
        gaps = [r["gap_pct"] for r in comparison_rows if r["gap_pct"] is not None]

        summary = {
            "total_so_freight_lines": len(so_lines),
            "total_po_freight_lines": len(po_lines),
            "total_so_freight_orders": len(order_groups),
            "total_matched_pairs": len(comparison_rows),
            "total_so_freight_value": round(total_so, 2),
            "total_po_freight_value": round(total_po, 2),
            "total_gap": round(total_so - total_po, 2),
            "avg_gap_pct": round(sum(gaps) / len(gaps), 3) if gaps else None,
            "pct_overquoted": round(
                sum(1 for g in gaps if g > 0) / len(gaps), 3
            ) if gaps else None,
            "by_product_type": {
                t: {
                    "so_total": round(d["so_total"], 2),
                    "po_total": round(d["po_total"], 2),
                    "gap": round(d["so_total"] - d["po_total"], 2),
                    "count": d["matched_count"],
                }
                for t, d in sorted(by_type.items())
            },
            "by_state": {
                s: {
                    "so_total": round(d["so_total"], 2),
                    "po_total": round(d["po_total"], 2),
                    "gap": round(d["so_total"] - d["po_total"], 2),
                    "count": d["matched_count"],
                }
                for s, d in sorted(by_state.items())
            },
        }

        vendor_out = []
        for vname, v in sorted(vendor_stats.items(), key=lambda x: -x[1]["total_cost"]):
            pc = len(v["po_count_set"])
            vendor_out.append({
                "vendor": vname,
                "po_count": pc,
                "total_cost": round(v["total_cost"], 2),
                "avg_cost": round(v["total_cost"] / v["line_count"], 2)
                if v["line_count"] else 0,
                "line_count": v["line_count"],
            })

        return {
            "so_po_comparison": sorted(
                comparison_rows, key=lambda r: -(r.get("gap") or 0),
            ),
            "summary": summary,
            "vendor_analysis": vendor_out,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "matched_by_analytic": sum(
                1 for r in comparison_rows if r.get("match_method") == "analytic"
            ),
            "matched_by_project_name": sum(
                1 for r in comparison_rows
                if r.get("match_method") == "project_name"
            ),
            "analytic_field_used": af,
        }


# ── Module-level convenience ─────────────────────────────────────────────────

_cache: dict[str, Any] = {}


def analyze(force_refresh: bool = False) -> dict[str, Any]:
    if not force_refresh and "result" in _cache:
        cached_at = _cache.get("cached_at", "")
        if cached_at:
            age_minutes = (
                datetime.now(timezone.utc)
                - datetime.fromisoformat(cached_at)
            ).total_seconds() / 60
            if age_minutes < 30:
                logger.info(
                    "Returning cached freight analysis (%.1f min old)",
                    age_minutes,
                )
                return _cache["result"]

    logger.info("Running fresh freight analysis...")
    analyser = FreightAnalyser()
    result = analyser.analyze()
    _cache["result"] = result
    _cache["cached_at"] = datetime.now(timezone.utc).isoformat()
    return result
