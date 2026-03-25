#!/usr/bin/env python3
"""
Upload standard shop drawing PDFs to Supabase Storage bucket `shop-drawings`
and optionally upsert rows into public.shop_drawings.

Environment:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Usage:
  python scripts/upload_shop_drawings.py
  python scripts/upload_shop_drawings.py --source "D:\\path\\to\\APP" --dry-run
  python scripts/upload_shop_drawings.py --no-db

Default source (Windows):
  C:\\Users\\CAD\\Con-form Group Dropbox\\Con-form Shared Drive\\Design\\02 Standard Platform Shop Drawings\\APP
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Any

try:
    from supabase import create_client, Client
except ImportError:
    print("Install dependencies: pip install -r scripts/requirements-shop-drawings.txt", file=sys.stderr)
    raise

BUCKET = "shop-drawings"

DEFAULT_APP_ROOT = Path(
    r"C:\Users\CAD\Con-form Group Dropbox\Con-form Shared Drive\Design\02 Standard Platform Shop Drawings\APP"
)

# Exact basenames that must not receive programmatic metadata (still uploaded).
NON_PARSEABLE_FILES = frozenset(
    {
        "CFG-EA-BURWOOD- DEAKIN UNIVERSITY-ACCESS-SYSTEM.pdf",
        "CFG-ES-CRANBOURNE WEST - BP.pdf",
        "CFG-ES-ES-SD-DETAILED DRAWING.pdf",
        "CFG-ES-ES-SD-MOUNTING DETAILED DRAWING.pdf",
        "CFG-ES-TAYLORS LAKES - WATERGARDENS SC - ALDI - 4800X8400 - S3.pdf",
        "CFG-ES-VERT SLAT DETAIL.pdf",
    }
)

# User listed four variants for Taylors Lakes — include pattern if multiple files exist.
NON_PARSEABLE_PREFIX = "CFG-ES-TAYLORS LAKES - WATERGARDENS SC - ALDI - 4800X8400 - S3"

# prefix -> meta: dims = trailing numeric segment count; has_pitch = last numeric is roof pitch when dims==3
PREFIX_META: dict[str, dict[str, Any]] = {
    "CFG-MR": {"dims": 3, "has_pitch": True, "base_type": "MR"},
    "CFG-CR": {"dims": 2, "has_pitch": False, "base_type": "CR"},
    "CFG-S1-MR": {"dims": 3, "has_pitch": True, "series": "S1", "base_type": "MR"},
    "CFG-S3-MR": {"dims": 3, "has_pitch": True, "series": "S3", "base_type": "MR"},
    "CFG-MR-LV": {"dims": 3, "has_pitch": True, "base_type": "MR", "screen_type": "LV"},
    "CFG-S1-MR-SD": {"dims": 3, "has_pitch": True, "series": "S1", "base_type": "MR", "screen_type": "SD"},
    "CFG-MR-GR": {"dims": 3, "has_pitch": True, "base_type": "MR", "screen_type": "GR"},
    "CFG-S3-MR-GR": {"dims": 3, "has_pitch": True, "series": "S3", "base_type": "MR", "screen_type": "GR"},
    "CFG-S2-CR": {"dims": 2, "has_pitch": False, "series": "S2", "base_type": "CR"},
    "CFG-ES-SD": {"dims": 2, "has_pitch": False, "base_type": "ES", "screen_type": "SD"},
    "CFG-S3-MR-SD": {"dims": 3, "has_pitch": True, "series": "S3", "base_type": "MR", "screen_type": "SD"},
    "CFG-MR-A+R": {"dims": 3, "has_pitch": True, "base_type": "MR", "screen_type": "A+R"},
    "CFG-A+CON": {"dims": 1, "has_pitch": False, "mount_type": "A+CON"},
    "CFG-MR-A+": {"dims": 3, "has_pitch": True, "base_type": "MR", "screen_type": "A+"},
    "CFG-CUS": {"dims": 3, "has_pitch": True, "base_type": "CUS"},
    "CFG-S1-MR-GR": {"dims": 3, "has_pitch": True, "series": "S1", "base_type": "MR", "screen_type": "GR"},
    "CFG-MR-OR": {"dims": 3, "has_pitch": True, "base_type": "MR", "screen_type": "OR"},
    "CFG-MR-ARF": {"dims": 3, "has_pitch": True, "base_type": "MR", "screen_type": "ARF"},
    "CFG-LV-STL": {"dims": 1, "has_pitch": False, "mount_type": "LV-STL"},
    "CFG-S3-MR-LW": {"dims": 3, "has_pitch": True, "series": "S3", "base_type": "MR", "screen_type": "LW"},
    "CFG-S1-CR-R": {"dims": 2, "has_pitch": False, "series": "S1", "base_type": "CR", "screen_type": "R"},
    "CFG-SP-GR": {"dims": 3, "has_pitch": True, "base_type": "SP", "screen_type": "GR"},
    "CFG-CR-A+": {"dims": 2, "has_pitch": False, "base_type": "CR", "screen_type": "A+"},
    "CFG-CR-AL": {"dims": 2, "has_pitch": False, "base_type": "CR", "screen_type": "AL"},
    "CFG-MR-AL": {"dims": 3, "has_pitch": True, "base_type": "MR", "screen_type": "AL"},
    "CFG-CR-CA": {"dims": 2, "has_pitch": False, "base_type": "CR", "screen_type": "CA"},
    "CFG-MR-CA": {"dims": 3, "has_pitch": True, "base_type": "MR", "screen_type": "CA"},
    "CFG-VLV-CON": {"dims": 1, "has_pitch": False, "mount_type": "VLV-CON"},
    "CFG-MR-GT": {"dims": 3, "has_pitch": True, "base_type": "MR", "screen_type": "GT"},
    "CFG-ES-SUN": {"dims": 3, "has_pitch": False, "base_type": "ES", "screen_type": "SUN"},
    "CFG-RR-GR": {"dims": 3, "has_pitch": True, "base_type": "RR", "screen_type": "GR"},
    "CFG-S1-MR-LW": {"dims": 3, "has_pitch": True, "series": "S1", "base_type": "MR", "screen_type": "LW"},
    "CFG-S1-MR-GD": {"dims": 3, "has_pitch": True, "series": "S1", "base_type": "MR", "screen_type": "GD"},
    "CFG-S3-MR-A+": {"dims": 3, "has_pitch": True, "series": "S3", "base_type": "MR", "screen_type": "A+"},
    "CFG-S2-CR-LW": {"dims": 2, "has_pitch": False, "series": "S2", "base_type": "CR", "screen_type": "LW"},
    "CFG-S2-CR-SDSS": {"dims": 2, "has_pitch": False, "series": "S2", "base_type": "CR", "screen_type": "SDSS"},
    "CFG-CR-LV": {"dims": 2, "has_pitch": False, "base_type": "CR", "screen_type": "LV"},
    "CFG-LV-CON": {"dims": 2, "has_pitch": False, "mount_type": "LV-CON"},
    "CFG-TCR": {"dims": 2, "has_pitch": False, "base_type": "TCR"},
    "CFG-LV-PR": {"dims": 2, "has_pitch": False, "mount_type": "LV-PR"},
    "CFG-LV-FR": {"dims": 2, "has_pitch": False, "mount_type": "LV-FR"},
    "CFG-CT": {"dims": 3, "has_pitch": True, "base_type": "CT"},
    "CFG-ES-LW": {"dims": 2, "has_pitch": False, "base_type": "ES", "screen_type": "LW"},
    "CFG-VUW-CON": {"dims": 2, "has_pitch": False, "mount_type": "VUW-CON"},
    "CFG-ES": {"dims": 2, "has_pitch": False, "base_type": "ES"},
}

_SORTED_PREFIXES = sorted(PREFIX_META.keys(), key=len, reverse=True)
_VERSION_RE = re.compile(r"^(?P<base>.+)-V(\d+)$", re.IGNORECASE)


def is_non_parseable(basename: str) -> bool:
    if basename in NON_PARSEABLE_FILES:
        return True
    if basename.startswith(NON_PARSEABLE_PREFIX):
        return True
    return False


def _parse_numeric_segments(rest: str) -> list[float]:
    """Split remainder on '-' into numeric tokens (supports decimals)."""
    if not rest:
        return []
    parts = rest.split("-")
    nums: list[float] = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        try:
            nums.append(float(p) if "." in p else int(p))
        except ValueError:
            return []
    return nums


def parse_cfg_pdf(basename: str, bucket_path: str) -> dict[str, Any] | None:
    """Return a row dict for shop_drawings or None if skipped."""
    if not basename.upper().endswith(".PDF"):
        return None
    if is_non_parseable(basename):
        return {
            "bucket_path": bucket_path,
            "filename": basename,
            "prefix_family": "NON_STANDARD",
            "series": None,
            "base_type": None,
            "screen_type": None,
            "mount_type": None,
            "width_mm": None,
            "length_mm": None,
            "pitch_deg": None,
            "version": 1,
            "parseable": False,
        }

    stem = basename[:-4]
    version = 1
    m = _VERSION_RE.match(stem)
    if m:
        stem = m.group("base")
        version = int(m.group(2))

    matched: str | None = None
    rest = ""
    for p in _SORTED_PREFIXES:
        if stem == p:
            matched = p
            rest = ""
            break
        if stem.startswith(p + "-"):
            matched = p
            rest = stem[len(p) + 1 :]
            break

    if not matched:
        return {
            "bucket_path": bucket_path,
            "filename": basename,
            "prefix_family": "UNKNOWN",
            "series": None,
            "base_type": None,
            "screen_type": None,
            "mount_type": None,
            "width_mm": None,
            "length_mm": None,
            "pitch_deg": None,
            "version": version,
            "parseable": False,
        }

    meta = PREFIX_META[matched]
    dims: int = meta["dims"]
    has_pitch: bool = meta["has_pitch"]
    nums = _parse_numeric_segments(rest)
    if len(nums) != dims:
        return {
            "bucket_path": bucket_path,
            "filename": basename,
            "prefix_family": matched,
            "series": meta.get("series"),
            "base_type": meta.get("base_type"),
            "screen_type": meta.get("screen_type"),
            "mount_type": meta.get("mount_type"),
            "width_mm": None,
            "length_mm": None,
            "pitch_deg": None,
            "version": version,
            "parseable": False,
        }

    row: dict[str, Any] = {
        "bucket_path": bucket_path,
        "filename": basename,
        "prefix_family": matched,
        "series": meta.get("series"),
        "base_type": meta.get("base_type"),
        "screen_type": meta.get("screen_type"),
        "mount_type": meta.get("mount_type"),
        "version": version,
        "parseable": True,
    }

    if dims == 1:
        row["width_mm"] = int(nums[0])
        row["length_mm"] = None
        row["pitch_deg"] = None
    elif dims == 2:
        row["width_mm"] = int(nums[0])
        row["length_mm"] = int(nums[1])
        row["pitch_deg"] = None
    else:
        row["width_mm"] = int(nums[0])
        row["length_mm"] = int(nums[1])
        if has_pitch:
            row["pitch_deg"] = nums[2]
        else:
            # e.g. CFG-ES-SUN: third value stored in pitch_deg column for querying
            row["pitch_deg"] = nums[2]

    return row


def collect_pdfs(app_root: Path) -> list[Path]:
    return sorted(p for p in app_root.rglob("*.pdf") if p.is_file())


def upload_one(client: Client | None, pdf_path: Path, app_root: Path, dry_run: bool) -> tuple[bool, str]:
    rel = pdf_path.relative_to(app_root).as_posix()
    if dry_run:
        return True, rel
    data = pdf_path.read_bytes()
    try:
        client.storage.from_(BUCKET).upload(
            rel,
            data,
            file_options={
                "content-type": "application/pdf",
                # storage3 maps this to x-upsert; string matches Storage API expectations
                "upsert": "true",
            },
        )
        return True, rel
    except Exception as e:
        return False, f"{rel}: {e!s}"


def upsert_rows(client: Client, rows: list[dict[str, Any]], dry_run: bool) -> tuple[int, list[str]]:
    if dry_run or not rows:
        return len(rows), []
    failures: list[str] = []
    chunk = 200
    for i in range(0, len(rows), chunk):
        batch = rows[i : i + chunk]
        try:
            client.table("shop_drawings").upsert(batch, on_conflict="bucket_path").execute()
        except Exception as e:
            failures.append(f"batch[{i}:{i+len(batch)}]: {e!s}")
    return len(rows), failures


def main() -> int:
    parser = argparse.ArgumentParser(description="Upload shop drawing PDFs to Supabase Storage.")
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_APP_ROOT,
        help="Root APP folder containing PDFs",
    )
    parser.add_argument("--dry-run", action="store_true", help="Do not call Supabase")
    parser.add_argument("--no-db", action="store_true", help="Skip shop_drawings upsert")
    args = parser.parse_args()

    app_root: Path = args.source.resolve()
    if not app_root.is_dir():
        print(f"Source directory does not exist: {app_root}", file=sys.stderr)
        return 2

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not args.dry_run and (not url or not key):
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 2

    client: Client | None = None
    if not args.dry_run:
        client = create_client(url, key)

    pdfs = collect_pdfs(app_root)
    uploaded = 0
    upload_failures: list[str] = []
    db_rows: list[dict[str, Any]] = []

    for pdf in pdfs:
        rel = pdf.relative_to(app_root).as_posix()
        ok, msg = upload_one(client, pdf, app_root, args.dry_run)
        if ok:
            uploaded += 1
            if not args.no_db:
                row = parse_cfg_pdf(pdf.name, rel)
                if row:
                    db_rows.append(row)
        else:
            upload_failures.append(msg)

    db_failures: list[str] = []
    if not args.no_db and client is not None:
        _, db_failures = upsert_rows(client, db_rows, args.dry_run)
    elif args.dry_run and not args.no_db:
        pass

    print("--- Summary ---")
    print(f"PDFs found:      {len(pdfs)}")
    print(f"Uploaded OK:    {uploaded}")
    print(f"Upload failed:  {len(upload_failures)}")
    if not args.no_db:
        print(f"DB rows queued: {len(db_rows)}")
    if upload_failures:
        print("\nUpload failures:")
        for f in upload_failures:
            print(f"  {f}")
    if db_failures:
        print("\nDB failures:")
        for f in db_failures:
            print(f"  {f}")

    return 0 if not upload_failures and not db_failures else 1


if __name__ == "__main__":
    sys.exit(main())
