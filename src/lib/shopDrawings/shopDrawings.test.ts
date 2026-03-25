import { describe, expect, it } from "vitest";
import {
  buildMountedFilenameCandidates,
  buildShopDrawingFilenameCandidates,
  pitchSegmentCandidates,
  resolveStandardPrefix,
} from "./buildFilename";
import { normalizeShopDrawingStoragePath } from "./integration";

describe("pitchSegmentCandidates", () => {
  it("includes integer and trimmed float forms", () => {
    expect(pitchSegmentCandidates(3)).toContain("3");
    expect(pitchSegmentCandidates(3.5)).toContain("3.5");
  });
});

describe("resolveStandardPrefix", () => {
  it("resolves CFG-S3-MR-GR", () => {
    expect(
      resolveStandardPrefix({
        baseType: "MR",
        series: "S3",
        screenType: "GR",
        width: 1,
        length: 1,
        pitch: 1,
      }),
    ).toBe("CFG-S3-MR-GR");
  });

  it("returns null for unknown product combination", () => {
    expect(
      resolveStandardPrefix({
        baseType: "MR",
        series: "S3",
        screenType: "SUN",
        width: 1,
        length: 1,
        pitch: 1,
      }),
    ).toBeNull();
  });
});

describe("buildShopDrawingFilenameCandidates", () => {
  it("builds MR drawing names with pitch variants", () => {
    const c = buildShopDrawingFilenameCandidates({
      baseType: "MR",
      width: 3000,
      length: 2400,
      pitch: 3.5,
    });
    expect(c).toContain("CFG-MR-3000-2400-3.5.pdf");
  });

  it("builds S3 MR GR", () => {
    const c = buildShopDrawingFilenameCandidates({
      baseType: "MR",
      series: "S3",
      screenType: "GR",
      width: 5400,
      length: 6000,
      pitch: 3,
    });
    expect(c).toContain("CFG-S3-MR-GR-5400-6000-3.pdf");
  });

  it("requires length for CR", () => {
    expect(
      buildShopDrawingFilenameCandidates({
        baseType: "CR",
        width: 1200,
      }),
    ).toBeNull();
  });

  it("builds CR with two dims", () => {
    expect(
      buildShopDrawingFilenameCandidates({
        baseType: "CR",
        width: 1200,
        length: 4800,
      }),
    ).toEqual(["CFG-CR-1200-4800.pdf"]);
  });
});

describe("buildMountedFilenameCandidates", () => {
  it("builds A+CON single dimension", () => {
    expect(buildMountedFilenameCandidates({ mountType: "A+CON", width: 18000 })).toEqual([
      "CFG-A+CON-18000.pdf",
    ]);
  });

  it("builds LV-CON two dimensions", () => {
    expect(
      buildMountedFilenameCandidates({ mountType: "LV-CON", width: 7930, length: 9875 }),
    ).toEqual(["CFG-LV-CON-7930-9875.pdf"]);
  });
});

describe("normalizeShopDrawingStoragePath", () => {
  it("rejects nested bucket segments", () => {
    expect(() => normalizeShopDrawingStoragePath("shop-drawings/foo.pdf")).toThrow(/Invalid shop drawing path/);
    expect(() => normalizeShopDrawingStoragePath("custom/shop-drawings/westfield/x.pdf")).toThrow(
      /Invalid shop drawing path/,
    );
    expect(normalizeShopDrawingStoragePath("01 EASYMECH MR/CFG-MR-3000-2400-3.5.pdf")).toBe(
      "01 EASYMECH MR/CFG-MR-3000-2400-3.5.pdf",
    );
  });

  it("rejects legacy standard-platform paths from the old Estimator", () => {
    expect(() => normalizeShopDrawingStoragePath("standard-platform/3000-4200-100.pdf")).toThrow(
      /Legacy path/,
    );
  });
});

describe("estimatorProductToShopDrawingLookup", () => {
  it("maps Galaxy MR to CFG-MR-* (standard APP folder, not CFG-S1-MR)", async () => {
    const { estimatorProductToShopDrawingLookup } = await import("./estimatorMapping");
    const { buildShopDrawingFilenameCandidates } = await import("./buildFilename");
    const lookup = estimatorProductToShopDrawingLookup({
      productLabel: "EasyMech MR (Galaxy)",
      widthMm: 4800,
      lengthMm: 6000,
      pitchDeg: 3,
    });
    expect(lookup.series).toBeUndefined();
    const names = buildShopDrawingFilenameCandidates(lookup);
    expect(names).toContain("CFG-MR-4800-6000-3.pdf");
  });

  it("maps explicit Series 1 to CFG-S1-MR-*", async () => {
    const { estimatorProductToShopDrawingLookup } = await import("./estimatorMapping");
    const { buildShopDrawingFilenameCandidates } = await import("./buildFilename");
    const lookup = estimatorProductToShopDrawingLookup({
      productLabel: "EasyMech MR Series 1",
      widthMm: 3000,
      lengthMm: 4200,
      pitchDeg: 3,
    });
    expect(lookup.series).toBe("S1");
    expect(buildShopDrawingFilenameCandidates(lookup)).toContain("CFG-S1-MR-3000-4200-3.pdf");
  });
});
