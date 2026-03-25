export type ShopDrawingBaseType =
  | "MR"
  | "CR"
  | "RR"
  | "CT"
  | "TCR"
  | "SP"
  | "CUS"
  | "ES"
  | "EA";

export type ShopDrawingSeries = "S1" | "S2" | "S3";

export type ShopDrawingScreenType =
  | "GR"
  | "A+"
  | "LV"
  | "AL"
  | "SD"
  | "LW"
  | "A+R"
  | "ARF"
  | "CA"
  | "OR"
  | "GT"
  | "GD"
  | "R"
  | "SDSS"
  | "SUN";

export interface ShopDrawingLookup {
  baseType: ShopDrawingBaseType;
  width: number;
  series?: ShopDrawingSeries;
  screenType?: ShopDrawingScreenType;
  length?: number;
  pitch?: number;
  /** Third numeric segment when the prefix uses 3 dimensions without roof pitch (e.g. CFG-ES-SUN). */
  tertiaryMm?: number;
}

export type MountedMountType = "A+CON" | "LV-CON" | "LV-STL" | "LV-PR" | "LV-FR" | "VLV-CON" | "VUW-CON";

export interface MountedShopDrawingLookup {
  mountType: MountedMountType;
  width: number;
  length?: number;
}

export interface ShopDrawingResult {
  filename: string;
  bucketPath: string;
  publicUrl: string;
  signedUrl?: string;
  variants?: string[];
  /** Present when nearestPitch matching was used */
  matchedPitch?: number;
}

export interface ShopDrawingLookupOptions {
  /** Default 3600 */
  signedUrlExpiresSec?: number;
  nearestPitch?: boolean;
  includeVariants?: boolean;
  /** If true, skip createSignedUrl (e.g. bucket is public). */
  publicBucketOnly?: boolean;
}
