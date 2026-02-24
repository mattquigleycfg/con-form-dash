"""Installation cost analysis module.

Connects to Odoo 16 XML-RPC to fetch SO and PO installation lines,
links them via analytic accounts, extracts platform dimensions, and
computes per-m2 rates and overquote metrics so quoting staff can see
real data instead of guessing man-days.
"""

import logging
import re
import xmlrpc.client
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Classification ───────────────────────────────────────────────────────────

SO_TYPE_MAP: dict[str, str] = {
    "EasyMechMR Platform Kit": "MR",
    "EasyMechMR Platform Install": "MR",
    "EasyMechCR Platform Kit": "CR",
    "EasyMechCR Platform Install": "CR",
    "Span+ Platform Install": "Span+",
    "Screen to Roof Install": "Screen",
    "Screen to Steel Platform": "Screen",
    "Galaxy Platform with Acoustic Screens Install": "Screen",
}

PRODUCT_TYPE_PATTERNS: dict[str, re.Pattern] = {
    "MR": re.compile(r"EASYMECH\s*MR|MR\s+\d+\.?\d*\s*[xX]|\[EMMRS|\[EMMR\d", re.I),
    "CR": re.compile(r"EASYMECH\s*CR|CR\s+\d+\.?\d*\s*[xX]|\[EMMCR", re.I),
    "Span+": re.compile(r"EASYMECH\s*SPAN\+|SPAN\+|SPAN\s+\d", re.I),
    "Screen": re.compile(
        r"ACOUSTIC\+?\s*SCREEN|CLASSIC\s*/\s*LOUVRE|CONCEAL|LOUVRE\s+SCREEN|LV100",
        re.I,
    ),
}

# ── Dimension extraction ─────────────────────────────────────────────────────

ACROSS_DOWN_RE = re.compile(
    r"(\d[\d,]*)\s*mm\s*wide\s*\(?\s*down\s*(?:the\s*)?roof\s*\)?\s*[xX]\s*"
    r"(\d[\d,]*)\s*mm\s*long\s*\(?\s*across\s*(?:the\s*)?roof",
    re.I,
)

PLAT_SECTION_RE = re.compile(
    r"(P\d+(?:\.\d+)?)\s*[-:]\s*(\d[\d,]*)\s*mm\s*wide\s*\(?\s*down\s*(?:the\s*)?roof\s*\)?\s*"
    r"[xX]\s*(\d[\d,]*)\s*mm\s*long\s*\(?\s*across",
    re.I,
)

TAB_DIM_RE = re.compile(
    r"(?:MR|CR|Span)\S*\s+(\d+\.?\d*)\s*[xX]\s*(\d+\.?\d*)", re.I
)

STATE_RE = re.compile(r"INSTALLATION\s*\((\w+)\)", re.I)

BATCH_SIZE = 500


def _parse_mm(raw: str) -> float:
    return float(raw.replace(",", "")) / 1000.0


def extract_dimensions_m2(text: str) -> Optional[float]:
    """Return total platform area in m2 from an SO line description."""
    sections = PLAT_SECTION_RE.findall(text)
    if sections:
        total = 0.0
        for _, w_mm, l_mm in sections:
            total += _parse_mm(w_mm) * _parse_mm(l_mm)
        return round(total, 2) if total > 0 else None

    m = ACROSS_DOWN_RE.search(text)
    if m:
        return round(_parse_mm(m.group(1)) * _parse_mm(m.group(2)), 2)

    m = TAB_DIM_RE.search(text)
    if m:
        area = float(m.group(1)) * float(m.group(2))
        return round(area, 2) if area > 0 else None

    return None


def extract_state(description: str) -> Optional[str]:
    m = STATE_RE.search(description)
    if m:
        val = m.group(1).upper()
        if val in ("NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"):
            return val
    return None


def extract_analytic_id(line: dict, field: str) -> Optional[int]:
    """Pull the analytic account id regardless of Odoo version."""
    val = line.get(field)
    if not val:
        return None
    if field == "analytic_distribution" and isinstance(val, dict):
        keys = list(val.keys())
        return int(keys[0]) if keys else None
    if isinstance(val, (list, tuple)):
        return int(val[0])
    if isinstance(val, (int, float)):
        return int(val)
    return None


# ── Odoo helper ──────────────────────────────────────────────────────────────

class OdooRPC:
    """Thin wrapper around Odoo 16 XML-RPC."""

    def __init__(self) -> None:
        s = get_settings()
        self.url = s.odoo_url.rstrip("/")
        self.db = s.odoo_db
        self.username = s.odoo_username
        self.password = s.odoo_password
        self._uid: Optional[int] = None
        self._models: Optional[xmlrpc.client.ServerProxy] = None

    def _connect(self) -> None:
        common = xmlrpc.client.ServerProxy(
            f"{self.url}/xmlrpc/2/common", allow_none=True
        )
        self._uid = common.authenticate(self.db, self.username, self.password, {})
        if not self._uid:
            raise RuntimeError("Odoo authentication failed")
        self._models = xmlrpc.client.ServerProxy(
            f"{self.url}/xmlrpc/2/object", allow_none=True
        )

    @property
    def models(self) -> xmlrpc.client.ServerProxy:
        if self._models is None:
            self._connect()
        return self._models  # type: ignore[return-value]

    @property
    def uid(self) -> int:
        if self._uid is None:
            self._connect()
        return self._uid  # type: ignore[return-value]

    def search_read(
        self,
        model: str,
        domain: list,
        fields: list[str],
        limit: int = BATCH_SIZE,
        order: str = "id asc",
    ) -> list[dict]:
        """Paginated search_read that fetches all matching records."""
        offset = 0
        all_records: list[dict] = []
        while True:
            batch = self.models.execute_kw(
                self.db,
                self.uid,
                self.password,
                model,
                "search_read",
                [domain],
                {
                    "fields": fields,
                    "limit": limit,
                    "offset": offset,
                    "order": order,
                },
            )
            if not batch:
                break
            all_records.extend(batch)
            if len(batch) < limit:
                break
            offset += limit
        return all_records


# ── Main analyser ────────────────────────────────────────────────────────────

class InstallationAnalyser:
    def __init__(self) -> None:
        self.odoo = OdooRPC()
        self._analytic_field: Optional[str] = None

    def _detect_analytic_field(self) -> str:
        """Check whether the Odoo instance uses analytic_distribution (17+)
        or analytic_account_id (16)."""
        if self._analytic_field:
            return self._analytic_field
        try:
            test = self.odoo.models.execute_kw(
                self.odoo.db,
                self.odoo.uid,
                self.odoo.password,
                "sale.order.line",
                "search_read",
                [[]],
                {"fields": ["analytic_distribution"], "limit": 1},
            )
            if test and "analytic_distribution" in test[0]:
                self._analytic_field = "analytic_distribution"
            else:
                self._analytic_field = "analytic_account_id"
        except Exception:
            self._analytic_field = "analytic_account_id"
        logger.info("Using analytic field: %s", self._analytic_field)
        return self._analytic_field

    # ── Data fetching ────────────────────────────────────────────────────

    def _fetch_so_install_lines(self) -> list[dict]:
        af = self._detect_analytic_field()
        fields = [
            "order_id",
            "product_id",
            "product_uom_qty",
            "price_unit",
            "price_subtotal",
            "name",
            af,
        ]
        domain = [
            "|",
            ["product_id.default_code", "=", "INS001"],
            ["product_id.name", "ilike", "INSTALLATION"],
            ["order_id.state", "in", ["sale", "done"]],
            ["product_uom_qty", ">", 0],
        ]
        lines = self.odoo.search_read("sale.order.line", domain, fields)
        logger.info("Fetched %d SO installation lines", len(lines))
        return lines

    def _fetch_po_install_lines(self) -> list[dict]:
        af = self._detect_analytic_field()
        fields = [
            "order_id",
            "product_id",
            "product_qty",
            "price_unit",
            "price_subtotal",
            "name",
            "partner_id",
            af,
        ]
        domain = [
            "|",
            ["product_id.default_code", "=", "INS001"],
            ["product_id.name", "ilike", "INSTALLATION"],
            ["order_id.state", "in", ["purchase", "done"]],
            ["product_qty", ">", 0],
        ]
        lines = self.odoo.search_read("purchase.order.line", domain, fields)
        logger.info("Fetched %d PO installation lines", len(lines))
        return lines

    def _fetch_so_headers(self, order_ids: list[int]) -> dict[int, dict]:
        """Fetch SO headers for classification (x_sale_order_type) and customer."""
        if not order_ids:
            return {}
        fields = ["id", "name", "partner_id", "x_sale_order_type"]
        try:
            records = self.odoo.search_read(
                "sale.order",
                [["id", "in", order_ids]],
                fields,
            )
        except Exception:
            fields = ["id", "name", "partner_id"]
            records = self.odoo.search_read(
                "sale.order",
                [["id", "in", order_ids]],
                fields,
            )
        return {r["id"]: r for r in records}

    def _fetch_sibling_lines(self, order_ids: list[int]) -> dict[int, list[dict]]:
        """Fetch all SO lines for given orders (for regex classification + dims)."""
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

    # ── Classification ───────────────────────────────────────────────────

    def _classify_order(
        self,
        so_header: dict,
        sibling_lines: list[dict],
    ) -> list[str]:
        """Return list of product types for an SO."""
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

                if "INSTALLATION" in combined.upper():
                    continue

                for ptype, pattern in PRODUCT_TYPE_PATTERNS.items():
                    if pattern.search(combined):
                        types.add(ptype)

        return sorted(types) if types else ["Unclassified"]

    def _extract_order_area(self, sibling_lines: list[dict]) -> Optional[float]:
        """Sum platform areas from sibling line descriptions."""
        total_area = 0.0
        for ln in sibling_lines:
            desc = ln.get("name", "") or ""
            prod_name = ""
            if isinstance(ln.get("product_id"), (list, tuple)):
                prod_name = str(ln["product_id"][1])
            if "INSTALLATION" in (prod_name + desc).upper():
                continue
            area = extract_dimensions_m2(desc)
            if area and area > 0:
                total_area += area
        return round(total_area, 2) if total_area > 0 else None

    # ── Core analysis ────────────────────────────────────────────────────

    def analyze(self) -> dict[str, Any]:
        af = self._detect_analytic_field()

        so_lines = self._fetch_so_install_lines()
        po_lines = self._fetch_po_install_lines()

        so_order_ids = list({
            (ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"])
            for ln in so_lines
        })
        so_headers = self._fetch_so_headers(so_order_ids)
        siblings = self._fetch_sibling_lines(so_order_ids)

        # Index SO install lines by analytic account
        so_by_analytic: dict[int, list[dict]] = defaultdict(list)
        for ln in so_lines:
            aid = extract_analytic_id(ln, af)
            if aid:
                so_by_analytic[aid].append(ln)

        # Index PO install lines by analytic account
        po_by_analytic: dict[int, list[dict]] = defaultdict(list)
        for ln in po_lines:
            aid = extract_analytic_id(ln, af)
            if aid:
                po_by_analytic[aid].append(ln)

        # Index PO lines by vendor for vendor analysis
        vendor_stats: dict[str, dict] = defaultdict(lambda: {
            "vendor": "",
            "vendor_state": "",
            "po_count_set": set(),
            "total_units": 0.0,
            "total_cost": 0.0,
            "states_worked": set(),
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
            qty = ln.get("product_qty", 0) or 0
            cost = ln.get("price_subtotal", 0) or 0
            v = vendor_stats[vendor_name]
            v["vendor"] = vendor_name
            v["po_count_set"].add(po_ref)
            v["total_units"] += qty
            v["total_cost"] += cost
            state = extract_state(ln.get("name", "") or "")
            if state:
                v["states_worked"].add(state)

        # Build matched SO-PO comparison rows
        so_po_rows: list[dict] = []
        # Track per-type and per-m2 aggregation
        by_type: dict[str, dict] = defaultdict(lambda: {
            "order_ids": set(),
            "total_install_qty": 0.0,
            "total_install_revenue": 0.0,
            "total_area_m2": 0.0,
            "area_count": 0,
            "by_state": defaultdict(lambda: {
                "order_ids": set(),
                "total_qty": 0.0,
                "total_revenue": 0.0,
            }),
        })
        per_m2_buckets: dict[int, dict] = defaultdict(lambda: {
            "platforms": 0,
            "total_install_units": 0.0,
            "total_install_cost": 0.0,
            "total_area": 0.0,
        })

        for so_ln in so_lines:
            oid = so_ln["order_id"][0] if isinstance(so_ln["order_id"], (list, tuple)) else so_ln["order_id"]
            header = so_headers.get(oid, {})
            sibs = siblings.get(oid, [])
            types = self._classify_order(header, sibs)
            area_m2 = self._extract_order_area(sibs)
            state = extract_state(so_ln.get("name", "") or "")
            so_qty = so_ln.get("product_uom_qty", 0) or 0
            so_rate = so_ln.get("price_unit", 0) or 0
            so_rev = so_ln.get("price_subtotal", 0) or (so_qty * so_rate)
            customer = ""
            if isinstance(header.get("partner_id"), (list, tuple)):
                customer = str(header["partner_id"][1])
            so_ref = header.get("name", "")

            for t in types:
                bt = by_type[t]
                bt["order_ids"].add(oid)
                bt["total_install_qty"] += so_qty
                bt["total_install_revenue"] += so_rev
                if area_m2:
                    bt["total_area_m2"] += area_m2
                    bt["area_count"] += 1
                if state:
                    bs = bt["by_state"][state]
                    bs["order_ids"].add(oid)
                    bs["total_qty"] += so_qty
                    bs["total_revenue"] += so_rev

            if area_m2 and area_m2 > 0:
                bucket = int(area_m2)
                b = per_m2_buckets[bucket]
                b["platforms"] += 1
                b["total_install_units"] += so_qty
                b["total_install_cost"] += so_rev
                b["total_area"] += area_m2

            # Try analytic match to PO
            aid = extract_analytic_id(so_ln, af)
            matched_po_lines = po_by_analytic.get(aid, []) if aid else []
            if matched_po_lines:
                po_qty_total = sum((p.get("product_qty", 0) or 0) for p in matched_po_lines)
                po_cost_total = sum((p.get("price_subtotal", 0) or 0) for p in matched_po_lines)
                po_rate_avg = po_cost_total / po_qty_total if po_qty_total else 0
                po_refs = []
                vendors = []
                for p in matched_po_lines:
                    if isinstance(p.get("order_id"), (list, tuple)):
                        po_refs.append(str(p["order_id"][1]))
                    if isinstance(p.get("partner_id"), (list, tuple)):
                        vendors.append(str(p["partner_id"][1]))

                overquote_ratio = so_qty / po_qty_total if po_qty_total > 0 else None
                margin = so_rev - po_cost_total
                margin_pct = margin / so_rev if so_rev > 0 else None

                so_po_rows.append({
                    "analytic_account_id": aid,
                    "so_ref": so_ref,
                    "customer": customer,
                    "product_types": types,
                    "state": state,
                    "platform_area_m2": area_m2,
                    "so_qty": round(so_qty, 2),
                    "so_rate": round(so_rate, 2),
                    "so_revenue": round(so_rev, 2),
                    "po_refs": list(set(po_refs)),
                    "vendors": list(set(vendors)),
                    "po_qty": round(po_qty_total, 2),
                    "po_rate": round(po_rate_avg, 2),
                    "po_cost": round(po_cost_total, 2),
                    "overquote_ratio": round(overquote_ratio, 3) if overquote_ratio else None,
                    "overquote_days": round(so_qty - po_qty_total, 2) if po_qty_total else None,
                    "margin": round(margin, 2),
                    "margin_pct": round(margin_pct, 3) if margin_pct is not None else None,
                })

        # ── Assemble output ──────────────────────────────────────────────

        per_m2_out: dict[str, dict] = {}
        for m2_val in sorted(per_m2_buckets.keys()):
            b = per_m2_buckets[m2_val]
            if b["platforms"] == 0:
                continue
            per_m2_out[str(m2_val)] = {
                "platforms": b["platforms"],
                "avg_install_units_per_plat": round(b["total_install_units"] / b["platforms"], 2),
                "avg_install_cost_per_plat": round(b["total_install_cost"] / b["platforms"], 2),
                "avg_install_per_m2": round(b["total_install_cost"] / b["total_area"], 2) if b["total_area"] else 0,
                "avg_units_per_m2": round(b["total_install_units"] / b["total_area"], 3) if b["total_area"] else 0,
            }

        by_type_out: dict[str, dict] = {}
        for t, bt in sorted(by_type.items()):
            oc = len(bt["order_ids"])
            if oc == 0:
                continue
            by_state_out: dict[str, dict] = {}
            for s, bs in sorted(bt["by_state"].items()):
                soc = len(bs["order_ids"])
                by_state_out[s] = {
                    "order_count": soc,
                    "total_qty": round(bs["total_qty"], 2),
                    "avg_qty": round(bs["total_qty"] / soc, 2) if soc else 0,
                    "avg_price": round(bs["total_revenue"] / bs["total_qty"], 2) if bs["total_qty"] else 0,
                }
            by_type_out[t] = {
                "order_count": oc,
                "total_install_qty": round(bt["total_install_qty"], 2),
                "total_install_revenue": round(bt["total_install_revenue"], 2),
                "avg_qty_per_order": round(bt["total_install_qty"] / oc, 2),
                "avg_price_per_unit": round(
                    bt["total_install_revenue"] / bt["total_install_qty"], 2
                ) if bt["total_install_qty"] else 0,
                "avg_area_m2": round(bt["total_area_m2"] / bt["area_count"], 2) if bt["area_count"] else None,
                "by_state": by_state_out,
            }

        # Overquote summary from matched rows
        matched_rows = [r for r in so_po_rows if r.get("overquote_ratio") is not None]
        overquote_summary: dict[str, Any] = {"total_matched_orders": len(matched_rows)}
        if matched_rows:
            ratios = [r["overquote_ratio"] for r in matched_rows]
            overquote_summary["avg_overquote_ratio"] = round(sum(ratios) / len(ratios), 3)
            overquote_summary["pct_overquoted"] = round(
                sum(1 for r in ratios if r > 1.0) / len(ratios), 3
            )
            overquote_summary["total_overquoted_days"] = round(
                sum(r.get("overquote_days", 0) or 0 for r in matched_rows), 2
            )
            # By type
            type_ratios: dict[str, list[float]] = defaultdict(list)
            state_ratios: dict[str, list[float]] = defaultdict(list)
            for r in matched_rows:
                for pt in r.get("product_types", []):
                    type_ratios[pt].append(r["overquote_ratio"])
                if r.get("state"):
                    state_ratios[r["state"]].append(r["overquote_ratio"])
            overquote_summary["avg_overquote_by_type"] = {
                k: round(sum(v) / len(v), 3) for k, v in sorted(type_ratios.items())
            }
            overquote_summary["avg_overquote_by_state"] = {
                k: round(sum(v) / len(v), 3) for k, v in sorted(state_ratios.items())
            }
        else:
            overquote_summary["avg_overquote_ratio"] = None
            overquote_summary["pct_overquoted"] = None
            overquote_summary["total_overquoted_days"] = 0
            overquote_summary["avg_overquote_by_type"] = {}
            overquote_summary["avg_overquote_by_state"] = {}

        vendor_out = []
        for vname, v in sorted(vendor_stats.items(), key=lambda x: -x[1]["total_cost"]):
            pc = len(v["po_count_set"])
            vendor_out.append({
                "vendor": vname,
                "po_count": pc,
                "total_units": round(v["total_units"], 2),
                "total_cost": round(v["total_cost"], 2),
                "avg_rate": round(v["total_cost"] / v["total_units"], 2) if v["total_units"] else 0,
                "states_worked": sorted(v["states_worked"]),
            })

        return {
            "per_m2_rates": per_m2_out,
            "by_product_type": by_type_out,
            "so_po_comparison": sorted(
                so_po_rows,
                key=lambda r: -(r.get("overquote_ratio") or 0),
            ),
            "overquote_summary": overquote_summary,
            "vendor_analysis": vendor_out,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_so_install_lines": len(so_lines),
            "total_po_install_lines": len(po_lines),
            "total_matched_pairs": len(matched_rows),
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
                logger.info("Returning cached installation analysis (%.1f min old)", age_minutes)
                return _cache["result"]

    logger.info("Running fresh installation analysis...")
    analyser = InstallationAnalyser()
    result = analyser.analyze()
    _cache["result"] = result
    _cache["cached_at"] = datetime.now(timezone.utc).isoformat()
    return result
