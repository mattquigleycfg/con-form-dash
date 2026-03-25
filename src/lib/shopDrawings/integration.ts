import { SHOP_DRAWINGS_BUCKET } from "./constants";

/**
 * Validates the object key passed to `storage.from('shop-drawings').createSignedUrl(path, ...)`.
 * The path must be relative to the bucket only (e.g. `01 EASYMECH MR/CFG-MR-3000-2400-3.5.pdf`).
 *
 * Rejects mistaken prefixes that caused 404s when the bucket name was duplicated inside the key
 * (e.g. `custom/shop-drawings/custom/...` or embedding `shop-drawings/` in the path).
 */
export function normalizeShopDrawingStoragePath(path: string): string {
  const p = path.trim().replace(/^\/+/, "");
  if (!p) {
    throw new Error("Shop drawing storage path is empty.");
  }
  const lower = p.toLowerCase();
  if (lower.includes(`${SHOP_DRAWINGS_BUCKET}/`) || lower.startsWith("custom/shop-drawings")) {
    throw new Error(
      `Invalid shop drawing path "${path}": use the path inside the bucket only, without "${SHOP_DRAWINGS_BUCKET}/" or "custom/shop-drawings/".`,
    );
  }
  return p;
}
