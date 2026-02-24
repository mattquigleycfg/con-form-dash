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
        or analytic_account_id (16).  We probe both fields and use whichever
        exists without erroring -- then prefer the one with data."""
        if self._analytic_field:
            return self._analytic_field

        valid_fields: list[str] = []
        for candidate in ("analytic_account_id", "analytic_distribution"):
            try:
                self.odoo.models.execute_kw(
                    self.odoo.db,
                    self.odoo.uid,
                    self.odoo.password,
                    "sale.order.line",
                    "search_read",
                    [[]],
                    {"fields": [candidate], "limit": 1},
                )
                valid_fields.append(candidate)
            except Exception:
                logger.info("Field %s not available on sale.order.line", candidate)

        if len(valid_fields) == 1:
            self._analytic_field = valid_fields[0]
        elif len(valid_fields) > 1:
            for vf in valid_fields:
                rows = self.odoo.models.execute_kw(
                    self.odoo.db,
                    self.odoo.uid,
                    self.odoo.password,
                    "sale.order.line",
                    "search_read",
                    [[]],
                    {"fields": [vf], "limit": 50},
                )
                if any(bool(r.get(vf)) for r in (rows or [])):
                    self._analytic_field = vf
                    break
            if not self._analytic_field:
                self._analytic_field = valid_fields[0]
        else:
            self._analytic_field = "analytic_distribution"

        logger.info("Using analytic field: %s", self._analytic_field)
        return self._analytic_field

    # ── Data fetching ────────────────────────────────────────────────────

    def _discover_installation_product_ids(self) -> list[int]:
        """Find all product.product IDs that are genuine INSTALLATION
        products.  Two-pronged search:
        1. product.template where stripped name == 'INSTALLATION' → variants
        2. product.product where stripped name == 'INSTALLATION' (catches
           products on separate templates like the INSTALLATION buffer)
        Excludes products like '[INS+FRE] EASYMECH MR PLATFORM'."""
        if hasattr(self, "_install_product_ids"):
            return self._install_product_ids

        all_ids: set[int] = set()

        # Prong 1: via templates (include archived with active_test=False)
        ctx = {"active_test": False}
        templates = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "product.template", "search_read",
            [[["name", "ilike", "INSTALLATION"]]],
            {"fields": ["id", "name"], "limit": 200, "context": ctx},
        )
        tmpl_ids = [
            t["id"] for t in templates
            if t.get("name", "").strip().upper() == "INSTALLATION"
        ]
        if tmpl_ids:
            variants = self.odoo.models.execute_kw(
                self.odoo.db, self.odoo.uid, self.odoo.password,
                "product.product", "search_read",
                [[["product_tmpl_id", "in", tmpl_ids]]],
                {"fields": ["id", "name", "default_code"], "limit": 500,
                 "context": ctx},
            )
            for v in variants:
                all_ids.add(v["id"])
            logger.info(
                "INSTALLATION templates %s → %d variants",
                [(t["id"], repr(t["name"])) for t in templates if t["id"] in tmpl_ids],
                len(variants),
            )

        # Prong 2: direct product search including archived
        products = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "product.product", "search_read",
            [[["name", "ilike", "INSTALLATION"]]],
            {"fields": ["id", "name", "default_code"], "limit": 500,
             "context": ctx},
        )
        for p in products:
            pname = (p.get("name") or "").strip().upper()
            if pname == "INSTALLATION":
                all_ids.add(p["id"])

        self._install_product_ids = sorted(all_ids)
        logger.info(
            "INSTALLATION product IDs (total %d): %s",
            len(self._install_product_ids),
            self._install_product_ids,
        )

        if not self._install_product_ids:
            logger.warning("No INSTALLATION products found")

        return self._install_product_ids

    def _fetch_installation_variant_prices(self) -> dict[str, float]:
        """Build state → lst_price map from INSTALLATION product variants.
        Used for lump-sum fallback: when an SO line has qty=1 and
        price_unit > $750, the real man-days are inferred by dividing
        the unit price by the per-day rate for that state."""
        if hasattr(self, "_variant_price_by_state"):
            return self._variant_price_by_state

        product_ids = self._discover_installation_product_ids()
        if not product_ids:
            self._variant_price_by_state: dict[str, float] = {}
            self._variant_id_to_state: dict[int, str] = {}
            return self._variant_price_by_state

        ctx = {"active_test": False}
        variants = self.odoo.models.execute_kw(
            self.odoo.db, self.odoo.uid, self.odoo.password,
            "product.product", "search_read",
            [[["id", "in", product_ids]]],
            {"fields": ["id", "lst_price", "product_template_attribute_value_ids"],
             "context": ctx},
        )

        all_attr_val_ids: set[int] = set()
        for v in variants:
            for av_id in (v.get("product_template_attribute_value_ids") or []):
                all_attr_val_ids.add(av_id)

        attr_val_names: dict[int, str] = {}
        if all_attr_val_ids:
            attr_vals = self.odoo.models.execute_kw(
                self.odoo.db, self.odoo.uid, self.odoo.password,
                "product.template.attribute.value", "search_read",
                [[["id", "in", list(all_attr_val_ids)]]],
                {"fields": ["id", "name"]},
            )
            for av in attr_vals:
                attr_val_names[av["id"]] = av.get("name", "")

        valid_states = {"NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"}
        state_price: dict[str, float] = {}
        variant_id_to_state: dict[int, str] = {}
        for v in variants:
            price = v.get("lst_price", 0) or 0
            if price <= 0:
                continue
            for av_id in (v.get("product_template_attribute_value_ids") or []):
                av_name = attr_val_names.get(av_id, "").strip().upper()
                if av_name in valid_states:
                    state_price[av_name] = price
                    variant_id_to_state[v["id"]] = av_name
                    break

        logger.info(
            "INSTALLATION variant prices by state: %s",
            {s: f"${p:,.2f}" for s, p in sorted(state_price.items())},
        )

        self._variant_price_by_state = state_price
        self._variant_id_to_state = variant_id_to_state
        return self._variant_price_by_state

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
        product_ids = self._discover_installation_product_ids()
        if product_ids:
            domain = [
                ["product_id", "in", product_ids],
                ["order_id.state", "in", ["sale", "done"]],
                ["product_uom_qty", ">", 0],
            ]
        else:
            domain = [
                "|",
                ["product_id.default_code", "=", "INS001"],
                ["product_id.name", "=", "INSTALLATION"],
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
        product_ids = self._discover_installation_product_ids()
        if product_ids:
            domain = [
                ["product_id", "in", product_ids],
                ["order_id.state", "in", ["purchase", "done"]],
                ["product_qty", ">", 0],
            ]
        else:
            domain = [
                "|",
                ["product_id.default_code", "=", "INS001"],
                ["product_id.name", "=", "INSTALLATION"],
                ["order_id.state", "in", ["purchase", "done"]],
                ["product_qty", ">", 0],
            ]
        lines = self.odoo.search_read("purchase.order.line", domain, fields)
        logger.info("Fetched %d PO installation lines", len(lines))
        return lines

    def _fetch_so_headers(self, order_ids: list[int]) -> dict[int, dict]:
        """Fetch SO headers for classification, customer, analytic account,
        and project_name (custom field used as matching fallback)."""
        if not order_ids:
            return {}
        base_fields = ["id", "name", "partner_id"]
        optional = ["x_sale_order_type", "analytic_account_id", "project_name"]
        fields = base_fields + optional
        for attempt in range(len(optional) + 1):
            try:
                records = self.odoo.search_read(
                    "sale.order",
                    [["id", "in", order_ids]],
                    fields,
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
                    logger.info("Field %s not on sale.order, retrying", removed)
                else:
                    raise
        records = self.odoo.search_read(
            "sale.order", [["id", "in", order_ids]], base_fields
        )
        return {r["id"]: r for r in records}

    def _fetch_po_headers(self, po_order_ids: list[int]) -> dict[int, dict]:
        """Fetch PO headers for project_id (custom field linking to
        project.project, which has its own analytic_account_id)."""
        if not po_order_ids:
            return {}
        base_fields = ["id", "name"]
        optional = ["project_id"]
        fields = base_fields + optional
        try:
            records = self.odoo.search_read(
                "purchase.order",
                [["id", "in", po_order_ids]],
                fields,
            )
        except Exception:
            logger.info("Field project_id not on purchase.order")
            return {}
        return {r["id"]: r for r in records}

    def _resolve_project_analytic_accounts(
        self, project_ids: list[int],
    ) -> dict[int, int]:
        """Given project.project IDs, return mapping of
        project_id -> analytic_account_id."""
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

        # ── Variant prices for lump-sum detection (SO + PO) ──────────────
        variant_prices = self._fetch_installation_variant_prices()

        # ── PO lump-sum adjustment ────────────────────────────────────────
        # Same logic as SO: when product_qty=1 and price_unit > $750 the PO
        # was raised as a lump sum.  Infer real days from state rate.
        po_lump_sum_count = 0
        for po_ln in po_lines:
            po_qty = po_ln.get("product_qty", 0) or 0
            po_rate = po_ln.get("price_unit", 0) or 0
            if po_qty == 1 and po_rate > 750 and variant_prices:
                po_state = extract_state(po_ln.get("name", "") or "")
                if not po_state and hasattr(self, "_variant_id_to_state"):
                    pid = po_ln.get("product_id")
                    if isinstance(pid, (list, tuple)):
                        pid = pid[0]
                    if isinstance(pid, int):
                        po_state = self._variant_id_to_state.get(pid)
                if po_state:
                    state_rate = variant_prices.get(po_state, 0)
                    if state_rate > 0:
                        inferred = po_rate / state_rate
                        po_oid = po_ln["order_id"]
                        if isinstance(po_oid, (list, tuple)):
                            po_oid = po_oid[1]
                        logger.info(
                            "PO lump-sum detected (%s): $%.2f / $%.2f (%s) "
                            "→ %.1f inferred days",
                            po_oid, po_rate, state_rate, po_state, inferred,
                        )
                        po_ln["product_qty"] = round(inferred, 2)
                        po_lump_sum_count += 1
        if po_lump_sum_count:
            logger.info("Adjusted %d PO lump-sum lines", po_lump_sum_count)

        so_order_ids = list({
            (ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"])
            for ln in so_lines
        })
        so_headers = self._fetch_so_headers(so_order_ids)
        siblings = self._fetch_sibling_lines(so_order_ids)

        # Collect unique PO order IDs for header fetch
        po_order_ids = list({
            (ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"])
            for ln in po_lines
        })
        po_headers = self._fetch_po_headers(po_order_ids)

        # Resolve PO project_id → analytic_account_id via project.project
        project_ids = []
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
            "PO project resolution: %d POs have project_id, %d resolved to analytic accounts",
            len(project_ids), len(project_to_analytic),
        )

        # ── Build PO analytic index (3 tiers) ────────────────────────────
        # Tier 1: PO line analytic_distribution (direct)
        # Tier 2: PO header project_id → project.project.analytic_account_id
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

        # ── Build SO analytic index ──────────────────────────────────────
        # SO line analytic_distribution (usually empty in Odoo 16)
        # → fallback to sale.order.analytic_account_id
        so_by_analytic: dict[int, list[dict]] = defaultdict(list)
        for ln in so_lines:
            aid = extract_analytic_id(ln, af)
            if not aid:
                oid = ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"]
                hdr = so_headers.get(oid, {})
                aid = extract_analytic_id(hdr, "analytic_account_id")
            if aid:
                so_by_analytic[aid].append(ln)

        # ── Build project_name index for tertiary fallback ───────────────
        # SO project_name (char) → PO project_id display name
        po_project_name_to_lines: dict[str, list[dict]] = defaultdict(list)
        for ln in po_lines:
            po_oid = ln["order_id"][0] if isinstance(ln["order_id"], (list, tuple)) else ln["order_id"]
            ph = po_headers.get(po_oid, {})
            pid = ph.get("project_id")
            if isinstance(pid, (list, tuple)) and len(pid) > 1:
                pname = str(pid[1]).strip().upper()
                if pname:
                    po_project_name_to_lines[pname].append(ln)

        so_with_analytic = len([ln for lns in so_by_analytic.values() for ln in lns])
        po_with_analytic = len([ln for lns in po_by_analytic.values() for ln in lns])
        common = set(so_by_analytic.keys()) & set(po_by_analytic.keys())
        logger.info(
            "Analytic matching: %d/%d SO lines have IDs, %d/%d PO lines have IDs, "
            "%d common analytic accounts, %d PO project names indexed",
            so_with_analytic, len(so_lines),
            po_with_analytic, len(po_lines),
            len(common),
            len(po_project_name_to_lines),
        )

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

        so_lump_sum_count = 0

        # ── Group SO installation lines by order ─────────────────────────
        # Each order should count as ONE platform entry, with total quoted
        # days = sum of all installation line quantities on that order.
        order_groups: dict[int, dict] = {}
        for so_ln in so_lines:
            oid = so_ln["order_id"][0] if isinstance(so_ln["order_id"], (list, tuple)) else so_ln["order_id"]
            qty = so_ln.get("product_uom_qty", 0) or 0
            rev = so_ln.get("price_subtotal", 0) or 0
            rate = so_ln.get("price_unit", 0) or 0
            if not rev and qty and rate:
                rev = qty * rate

            state = extract_state(so_ln.get("name", "") or "")
            if not state and hasattr(self, "_variant_id_to_state"):
                pid = so_ln.get("product_id")
                if isinstance(pid, (list, tuple)):
                    pid = pid[0]
                if isinstance(pid, int):
                    state = self._variant_id_to_state.get(pid)

            line_aid = extract_analytic_id(so_ln, af)

            # Lump-sum detection: qty=1 with high unit price means the
            # total was quoted as a lump sum; infer real man-days from
            # the INSTALLATION variant's per-day rate for this state
            is_lump_sum = False
            if qty == 1 and rate > 750 and variant_prices and state:
                state_rate = variant_prices.get(state, 0)
                if state_rate > 0:
                    inferred_qty = rate / state_rate
                    logger.info(
                        "Lump-sum detected (order %s): $%.2f / $%.2f (%s) "
                        "→ %.1f inferred days",
                        oid, rate, state_rate, state, inferred_qty,
                    )
                    qty = round(inferred_qty, 2)
                    is_lump_sum = True
                    so_lump_sum_count += 1

            if oid not in order_groups:
                header = so_headers.get(oid, {})
                sibs = siblings.get(oid, [])
                customer = ""
                if isinstance(header.get("partner_id"), (list, tuple)):
                    customer = str(header["partner_id"][1])
                hdr_aid = extract_analytic_id(header, "analytic_account_id")
                proj_name = (header.get("project_name") or "").strip()
                order_groups[oid] = {
                    "header": header,
                    "so_ref": header.get("name", ""),
                    "customer": customer,
                    "types": self._classify_order(header, sibs),
                    "area_m2": self._extract_order_area(sibs),
                    "total_qty": 0.0,
                    "total_revenue": 0.0,
                    "avg_rate": 0.0,
                    "states": set(),
                    "analytic_id": hdr_aid,
                    "project_name": proj_name,
                    "line_count": 0,
                    "lump_sum_inferred": False,
                }

            grp = order_groups[oid]
            grp["total_qty"] += qty
            grp["total_revenue"] += rev
            grp["line_count"] += 1
            if is_lump_sum:
                grp["lump_sum_inferred"] = True
            if state:
                grp["states"].add(state)
            if line_aid and not grp["analytic_id"]:
                grp["analytic_id"] = line_aid

        for grp in order_groups.values():
            if grp["total_qty"] > 0:
                grp["avg_rate"] = grp["total_revenue"] / grp["total_qty"]

        logger.info(
            "Grouped %d SO install lines into %d orders (%d with lump-sum inference)",
            len(so_lines), len(order_groups), so_lump_sum_count,
        )

        # ── Per-type, per-m2, and SO-PO matching (per order) ──────────
        so_po_rows: list[dict] = []
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

        for oid, grp in order_groups.items():
            types = grp["types"]
            area_m2 = grp["area_m2"]
            so_qty = grp["total_qty"]
            so_rev = grp["total_revenue"]
            so_rate_avg = grp["avg_rate"]
            primary_state = sorted(grp["states"])[0] if grp["states"] else None

            for t in types:
                bt = by_type[t]
                bt["order_ids"].add(oid)
                bt["total_install_qty"] += so_qty
                bt["total_install_revenue"] += so_rev
                if area_m2:
                    bt["total_area_m2"] += area_m2
                    bt["area_count"] += 1
                if primary_state:
                    bs = bt["by_state"][primary_state]
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

            aid = grp["analytic_id"]
            matched_po_lines = po_by_analytic.get(aid, []) if aid else []

            # Tertiary fallback: match by project_name → PO project_id name
            match_method = "analytic" if matched_po_lines else None
            if not matched_po_lines and grp["project_name"]:
                pn_upper = grp["project_name"].upper()
                matched_po_lines = po_project_name_to_lines.get(pn_upper, [])
                if matched_po_lines:
                    match_method = "project_name"

            if matched_po_lines:
                po_qty_total = sum((p.get("product_qty", 0) or 0) for p in matched_po_lines)
                po_cost_total = sum((p.get("price_subtotal", 0) or 0) for p in matched_po_lines)
                po_rate_avg = po_cost_total / po_qty_total if po_qty_total else 0
                po_refs = []
                vendors_list = []
                for p in matched_po_lines:
                    if isinstance(p.get("order_id"), (list, tuple)):
                        po_refs.append(str(p["order_id"][1]))
                    if isinstance(p.get("partner_id"), (list, tuple)):
                        vendors_list.append(str(p["partner_id"][1]))

                overquote_ratio = so_qty / po_qty_total if po_qty_total > 0 else None
                margin = so_rev - po_cost_total
                margin_pct = margin / so_rev if so_rev > 0 else None

                so_po_rows.append({
                    "analytic_account_id": aid,
                    "so_ref": grp["so_ref"],
                    "customer": grp["customer"],
                    "product_types": types,
                    "state": primary_state,
                    "platform_area_m2": area_m2,
                    "so_qty": round(so_qty, 2),
                    "so_rate": round(so_rate_avg, 2),
                    "so_revenue": round(so_rev, 2),
                    "po_refs": sorted(set(po_refs)),
                    "vendors": sorted(set(vendors_list)),
                    "po_qty": round(po_qty_total, 2),
                    "po_rate": round(po_rate_avg, 2),
                    "po_cost": round(po_cost_total, 2),
                    "overquote_ratio": round(overquote_ratio, 3) if overquote_ratio else None,
                    "overquote_days": round(so_qty - po_qty_total, 2) if po_qty_total else None,
                    "margin": round(margin, 2),
                    "margin_pct": round(margin_pct, 3) if margin_pct is not None else None,
                    "match_method": match_method,
                    "lump_sum_inferred": grp.get("lump_sum_inferred", False),
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
            "total_orders_analysed": len(order_groups),
            "total_matched_pairs": len(matched_rows),
            "matched_by_analytic": sum(1 for r in so_po_rows if r.get("match_method") == "analytic"),
            "matched_by_project_name": sum(1 for r in so_po_rows if r.get("match_method") == "project_name"),
            "lump_sum_so_lines": so_lump_sum_count,
            "lump_sum_po_lines": po_lump_sum_count,
            "variant_prices_by_state": variant_prices,
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
