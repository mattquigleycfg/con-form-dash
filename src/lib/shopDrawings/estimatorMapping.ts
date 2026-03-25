import type { ShopDrawingLookup, ShopDrawingSeries } from "./types";

/**
 * Inputs shaped like the Estimator “Products” row (dimensions in mm, pitch in degrees).
 * Copy this module into the Next.js Estimator app and feed the result to `lookupStandardShopDrawing`.
 */
export interface EstimatorPlatformLineInput {
  /** e.g. "EasyMech MR (Galaxy)" from the product picker */
  productLabel: string;
  widthMm: number;
  lengthMm: number;
  pitchDeg: number;
}

/**
 * Maps Estimator UI labels to `ShopDrawingLookup`.
 * Heuristic: "Galaxy" / "Series 1" → S1 (confirm with product team if drawings live under CFG-MR vs CFG-S1-MR).
 */
export function estimatorProductToShopDrawingLookup(input: EstimatorPlatformLineInput): ShopDrawingLookup {
  const label = input.productLabel.toLowerCase();
  let series: ShopDrawingSeries | undefined;
  if (label.includes("galaxy") || label.includes("series 1") || /\bs1\b/.test(label)) {
    series = "S1";
  } else if (label.includes("series 2") || /\bs2\b/.test(label)) {
    series = "S2";
  } else if (label.includes("series 3") || /\bs3\b/.test(label)) {
    series = "S3";
  }
  return {
    baseType: "MR",
    series,
    width: input.widthMm,
    length: input.lengthMm,
    pitch: input.pitchDeg,
  };
}
