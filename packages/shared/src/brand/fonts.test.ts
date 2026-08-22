import { describe, expect, it } from "vitest";

import {
  BRAND_FONTS,
  brandFontStylesheetUrl,
  findBrandFont,
  isSupportedBrandFont,
  nearestBrandFontWeight,
  resolveBrandFont,
} from "./fonts";

describe("brand font catalogue", () => {
  it("gives every family at least one fetchable weight and no duplicates", () => {
    const families = BRAND_FONTS.map((font) => font.family);
    expect(new Set(families).size).toBe(families.length);
    for (const font of BRAND_FONTS) {
      expect(font.weights.length).toBeGreaterThan(0);
      expect(font.weights.every((weight) => /^[1-9]00$/.test(weight))).toBe(true);
    }
  });

  it("matches families case- and space-insensitively at the edges", () => {
    expect(findBrandFont("  playfair display ")?.family).toBe("Playfair Display");
    expect(findBrandFont("Helvetica")).toBeUndefined();
  });

  it("snaps a requested weight to one the family publishes", () => {
    const anton = findBrandFont("Anton")!;
    expect(anton.weights).toEqual(["400"]);
    expect(nearestBrandFontWeight(anton, "700")).toBe("400");
    expect(resolveBrandFont("heading", { family: "Anton", weight: "700" })).toEqual({
      family: "Anton",
      weight: "400",
    });
  });

  it("keeps a weight the family does publish", () => {
    expect(resolveBrandFont("heading", { family: "Inter", weight: "900" })).toEqual({
      family: "Inter",
      weight: "900",
    });
  });

  it("falls back to the role default for an unknown family", () => {
    expect(resolveBrandFont("body", { family: "Comic Sans MS" })).toEqual({
      family: "Inter",
      weight: "400",
    });
    expect(resolveBrandFont("heading", null)).toEqual({ family: "Inter", weight: "700" });
  });

  it("reports support per family and weight", () => {
    expect(isSupportedBrandFont("Inter")).toBe(true);
    expect(isSupportedBrandFont("Inter", "700")).toBe(true);
    expect(isSupportedBrandFont("Anton", "700")).toBe(false);
    expect(isSupportedBrandFont("Arial")).toBe(false);
  });

  it("builds a stylesheet URL, optionally at a single weight", () => {
    expect(brandFontStylesheetUrl(["Anton", "Arial", "Anton"])).toBe(
      "https://fonts.googleapis.com/css2?family=Anton:wght@400&display=swap",
    );
    expect(brandFontStylesheetUrl(["Inter"], "700")).toBe(
      "https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap",
    );
    expect(brandFontStylesheetUrl(["Arial"])).toBeNull();
  });
});
