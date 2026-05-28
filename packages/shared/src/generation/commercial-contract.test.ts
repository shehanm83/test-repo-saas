import { describe, it, expect } from "vitest";
import { normalizeCommercialGenerationInput } from "./commercial-contract";

describe("normalizeCommercialGenerationInput — stockAssetId", () => {
  const BASE = {
    mode: "quick",
    creationType: "single_product",
    brandId: "00000000-0000-0000-0000-000000000001",
    brief: "test brief",
    productRefs: [],
    outputs: { variants: 1, quality: "standard", consistency: "off", formats: ["instagram_square"] },
  } as const;

  it("passes through a valid stockAssetId", () => {
    const id = "00000000-0000-0000-0000-000000000099";
    const result = normalizeCommercialGenerationInput({ ...BASE, stockAssetId: id });
    expect(result.stockAssetId).toBe(id);
  });

  it("defaults to null when stockAssetId is omitted", () => {
    const result = normalizeCommercialGenerationInput(BASE);
    expect(result.stockAssetId).toBeNull();
  });

  it("accepts null explicitly", () => {
    const result = normalizeCommercialGenerationInput({ ...BASE, stockAssetId: null });
    expect(result.stockAssetId).toBeNull();
  });
});
