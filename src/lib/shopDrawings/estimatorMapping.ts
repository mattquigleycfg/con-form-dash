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
 * Standard "01 EASYMECH MR" APP files use `CFG-MR-{W}-{L}-{pitch}.pdf`; "Galaxy" is that line — no series prefix.
 * Use `series` only when the product name explicitly indicates Series 1/2/3 (e.g. SS folder `CFG-S1-MR-*`).
 */
export function estimatorProductToShopDrawingLookup(input: EstimatorPlatformLineInput): ShopDrawingLookup {
  const label = input.productLabel.toLowerCase();
  let series: ShopDrawingSeries | undefined;
  if (label.includes("series 1") || /\bs1\b/.test(label)) {
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
