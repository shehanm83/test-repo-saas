import { describe, expect, it } from "vitest";

import { resolveOutputTarget } from "../output-targets";
import { normalizeCommercialGenerationInput, OutputFormat, OUTPUT_FORMAT_TARGETS } from "./commercial-contract";
import { runCommercialPreflight } from "./preflight";

const brandId = "00000000-0000-0000-0000-000000000001";
const uploadId = "00000000-0000-0000-0000-000000000099";
const logoAssetId = "00000000-0000-0000-0000-000000000077";

describe("commercial generation contract", () => {
  it("normalizes legacy input", () => {
    const normalized = normalizeCommercialGenerationInput({
      brandId,
      brief: "Summer sale",
      outputTarget: { kind: "image", aspectRatio: "1:1" },
      inspirationUploadId: uploadId,
      numVariants: 2,
      flags: { usePremiumModel: true },
    });

    expect(normalized.mode).toBe("legacy");
    expect(normalized.outputs.variants).toBe(2);
    expect(normalized.outputs.quality).toBe("premium");
    expect(normalized.inspirationUploadIds).toEqual([uploadId]);
  });

  it("normalizes commercial input to a primary output target", () => {
    const normalized = normalizeCommercialGenerationInput({
      mode: "campaign_builder",
      creationType: "social_ad_pack",
      brandId,
      productRefs: [{ uploadId, role: "hero", commercialFields: { name: "Serum" } }],
      campaign: { title: "Glow launch", cta: "Shop now" },
      template: { family: "social_ad", layout: "split" },
      brandLogoAssetIds: [logoAssetId],
      outputs: { variants: 3, quality: "standard", consistency: "same_mood", formats: ["instagram_story"] },
    });

    expect(normalized.outputTarget).toEqual({
      kind: "social",
      platform: "instagram",
      format: "story",
    });
    expect(normalized.brandLogoAssetIds).toEqual([logoAssetId]);
    expect(normalized.brief).toContain("Glow launch");
    expect(normalized.productRefs).toHaveLength(1);
  });

  it("maps every commercial output format to a resolvable target", () => {
    for (const format of OutputFormat.options) {
      const target = OUTPUT_FORMAT_TARGETS[format];
      expect(() => resolveOutputTarget(target)).not.toThrow();
    }
  });
});

describe("commercial preflight", () => {
  it("allows minimum quick create without brand or products", () => {
    const result = runCommercialPreflight({
      mode: "quick",
      creationType: "single_product",
      brief: "Create a clean campaign image",
      productRefs: [],
      template: { family: "product_hero", layout: "centered_product_hero" },
      outputs: { variants: 1, quality: "standard", consistency: "off", formats: ["instagram_square"] },
    });

    expect(result.blocking).toEqual([]);
  });

  it("blocks missing products for product modes", () => {
    const result = runCommercialPreflight({
      mode: "campaign_builder",
      creationType: "single_product",
      brandId,
      productRefs: [],
      campaign: {},
      template: { family: "product_hero", layout: "centered_product_hero" },
      outputs: { variants: 1, quality: "standard", consistency: "off", formats: ["product_card"] },
    });

    expect(result.blocking.some((issue) => issue.code === "product.required")).toBe(true);
  });

  it("warns when social ads miss CTA", () => {
    const result = runCommercialPreflight({
      mode: "campaign_builder",
      creationType: "social_ad_pack",
      brandId,
      productRefs: [{ uploadId, role: "hero" }],
      campaign: { title: "Launch" },
      template: { family: "social_ad", layout: "split" },
      outputs: { variants: 1, quality: "standard", consistency: "off", formats: ["instagram_square"] },
    });

    expect(result.warnings.some((issue) => issue.code === "commercial.cta_missing")).toBe(true);
  });
});
