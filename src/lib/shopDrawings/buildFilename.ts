import { PREFIX_META } from "./prefixCatalog";
import type { MountedShopDrawingLookup, ShopDrawingLookup } from "./types";

function trimFloatString(n: number): string {
  const s = n.toFixed(4).replace(/\.?0+$/, "");
  return s === "" ? "0" : s;
}

/** Pitch / numeric segment strings to try (filename variants). */
export function pitchSegmentCandidates(pitch: number): string[] {
  const out: string[] = [];
  if (Number.isInteger(pitch)) {
    out.push(String(pitch));
  }
  const t = trimFloatString(pitch);
  if (!out.includes(t)) {
    out.push(t);
  }
  return out;
}

export function resolveStandardPrefix(params: ShopDrawingLookup): string | null {
  const { baseType, series, screenType } = params;
  const parts = ["CFG"];
  if (series) {
    parts.push(series);
  }
  parts.push(baseType);
  if (screenType) {
    parts.push(screenType);
  }
  const p = parts.join("-");
  return p in PREFIX_META ? p : null;
}

function buildCfgPrefixMounted(m: MountedShopDrawingLookup): string {
  return `CFG-${m.mountType}`;
}

/**
 * Returns PDF filenames to try in order (exact pitch string variants).
 */
export function buildShopDrawingFilenameCandidates(params: ShopDrawingLookup): string[] | null {
  const prefix = resolveStandardPrefix(params);
  if (!prefix) {
    return null;
  }
  const meta = PREFIX_META[prefix];
  const { width, length, pitch, tertiaryMm } = params;

  if (meta.dims === 1) {
    return [`${prefix}-${width}.pdf`];
  }
  if (meta.dims === 2) {
    if (length === undefined) {
      return null;
    }
    return [`${prefix}-${width}-${length}.pdf`];
  }
  if (length === undefined) {
    return null;
  }
  if (meta.hasPitch) {
    if (pitch === undefined) {
      return null;
    }
    return pitchSegmentCandidates(pitch).map((pch) => `${prefix}-${width}-${length}-${pch}.pdf`);
  }
  if (tertiaryMm === undefined) {
    return null;
  }
  return [`${prefix}-${width}-${length}-${tertiaryMm}.pdf`];
}

export function buildMountedFilenameCandidates(m: MountedShopDrawingLookup): string[] | null {
  const prefix = buildCfgPrefixMounted(m);
  if (!(prefix in PREFIX_META)) {
    return null;
  }
  const meta = PREFIX_META[prefix];
  if (meta.dims === 1) {
    return [`${prefix}-${m.width}.pdf`];
  }
  if (m.length === undefined) {
    return null;
  }
  return [`${prefix}-${m.width}-${m.length}.pdf`];
}
