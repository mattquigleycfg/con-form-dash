import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildMountedFilenameCandidates, buildShopDrawingFilenameCandidates, resolveStandardPrefix } from "./buildFilename";
import { SHOP_DRAWINGS_BUCKET } from "./constants";
import { PREFIX_META } from "./prefixCatalog";
import type {
  MountedShopDrawingLookup,
  ShopDrawingLookup,
  ShopDrawingLookupOptions,
  ShopDrawingResult,
} from "./types";

type ShopDrawingRow = Database["public"]["Tables"]["shop_drawings"]["Row"];

async function findRowByFilenames(
  client: SupabaseClient<Database>,
  filenames: string[],
): Promise<ShopDrawingRow | null> {
  const { data } = await client
    .from("shop_drawings")
    .select("*")
    .in("filename", filenames)
    .eq("version", 1)
    .limit(10);
  return data?.[0] ?? null;
}

async function findNearestPitchRow(
  client: SupabaseClient<Database>,
  prefixFamily: string,
  widthMm: number,
  lengthMm: number,
  targetPitch: number,
): Promise<ShopDrawingRow | null> {
  const { data } = await client
    .from("shop_drawings")
    .select("*")
    .eq("prefix_family", prefixFamily)
    .eq("width_mm", widthMm)
    .eq("length_mm", lengthMm)
    .eq("version", 1)
    .eq("parseable", true);

  const rows = (data ?? []).filter((r) => r.pitch_deg != null) as ShopDrawingRow[];
  if (!rows.length) {
    return null;
  }
  let best: ShopDrawingRow | null = null;
  let bestDelta = Infinity;
  for (const r of rows) {
    const p = Number(r.pitch_deg);
    const d = Math.abs(p - targetPitch);
    if (d < bestDelta || (d === bestDelta && best != null && p < Number(best.pitch_deg))) {
      bestDelta = d;
      best = r;
    }
  }
  return best;
}

async function loadVariantFilenames(client: SupabaseClient<Database>, row: ShopDrawingRow): Promise<string[]> {
  let q = client
    .from("shop_drawings")
    .select("filename")
    .eq("prefix_family", row.prefix_family)
    .eq("width_mm", row.width_mm)
    .gt("version", 1);

  if (row.length_mm == null) {
    q = q.is("length_mm", null);
  } else {
    q = q.eq("length_mm", row.length_mm);
  }
  if (row.pitch_deg == null) {
    q = q.is("pitch_deg", null);
  } else {
    q = q.eq("pitch_deg", row.pitch_deg);
  }

  const { data } = await q.order("version", { ascending: true });
  return data?.map((d) => d.filename) ?? [];
}

async function toResult(
  client: SupabaseClient<Database>,
  row: ShopDrawingRow,
  options?: ShopDrawingLookupOptions,
  extras?: { matchedPitch?: number },
): Promise<ShopDrawingResult> {
  const expires = options?.signedUrlExpiresSec ?? 3600;
  const {
    data: { publicUrl },
  } = client.storage.from(SHOP_DRAWINGS_BUCKET).getPublicUrl(row.bucket_path);

  let signedUrl: string | undefined;
  if (!options?.publicBucketOnly) {
    const { data: signed, error } = await client.storage
      .from(SHOP_DRAWINGS_BUCKET)
      .createSignedUrl(row.bucket_path, expires);
    if (!error) {
      signedUrl = signed.signedUrl;
    }
  }

  let variants: string[] | undefined;
  if (options?.includeVariants) {
    variants = await loadVariantFilenames(client, row);
    if (variants.length === 0) {
      variants = undefined;
    }
  }

  return {
    filename: row.filename,
    bucketPath: row.bucket_path,
    publicUrl,
    signedUrl,
    variants,
    matchedPitch: extras?.matchedPitch,
  };
}

export async function lookupStandardShopDrawing(
  client: SupabaseClient<Database>,
  params: ShopDrawingLookup,
  options?: ShopDrawingLookupOptions,
): Promise<ShopDrawingResult | null> {
  const candidates = buildShopDrawingFilenameCandidates(params);
  if (!candidates?.length) {
    return null;
  }

  let row = await findRowByFilenames(client, candidates);
  let matchedPitch: number | undefined;

  if (!row && options?.nearestPitch) {
    const prefix = resolveStandardPrefix(params);
    const meta = prefix ? PREFIX_META[prefix] : undefined;
    if (
      prefix &&
      meta?.hasPitch &&
      meta.dims === 3 &&
      params.pitch != null &&
      params.length != null
    ) {
      const nearest = await findNearestPitchRow(client, prefix, params.width, params.length, params.pitch);
      if (nearest) {
        row = nearest;
        matchedPitch = Number(nearest.pitch_deg);
      }
    }
  }

  if (!row) {
    return null;
  }

  return toResult(client, row, options, { matchedPitch });
}

export async function lookupMountedShopDrawing(
  client: SupabaseClient<Database>,
  params: MountedShopDrawingLookup,
  options?: ShopDrawingLookupOptions,
): Promise<ShopDrawingResult | null> {
  const candidates = buildMountedFilenameCandidates(params);
  if (!candidates?.length) {
    return null;
  }
  const row = await findRowByFilenames(client, candidates);
  if (!row) {
    return null;
  }
  return toResult(client, row, options);
}
