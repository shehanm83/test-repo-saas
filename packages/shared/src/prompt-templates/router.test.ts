import { describe, expect, it } from "vitest";

import { normalizeCommercialGenerationInput } from "../generation/commercial-contract";
import { resolveOutputTarget } from "../output-targets";
import {
  buildQuickCreatePrompt,
  NO_CROP_NEGATIVE_PROMPT,
  NO_CROP_PROMPT_INSTRUCTION,
  routeQuickCreatePrompt,
} from "./router";

const brandId = "00000000-0000-0000-0000-000000000001";
const logoAssetId = "00000000-0000-0000-0000-000000000077";
const uploadId = "00000000-0000-0000-0000-000000000099";

function buildQuick(overrides: Record<string, unknown> = {}) {
  const input = {
    mode: "quick",
    creationType: "single_product",
    brandId: null,
    brief: "Create a clean studio image with soft light",
    productRefs: [],
    campaign: {},
    template: { family: "product_hero", layout: "centered_product_hero" },
    composition: {
      productSize: "balanced",
      productPosition: "template",
      backgroundStyle: "studio",
      realism: "realistic_photo",
      shadowReflection: "soft_shadow",
      labelVisibility: "preserve",
      packagingVisibility: "product_only",
      keepOriginalShape: true,
      brandBlend: "medium",
    },
    outputs: { variants: 1, quality: "standard", consistency: "off", formats: ["instagram_square"] },
    flags: {},
    ...overrides,
  };
  const normalized = normalizeCommercialGenerationInput(input);
  const outputTarget = resolveOutputTarget(normalized.outputTarget);
  return { normalized, outputTarget };
}

describe("quick create prompt routing", () => {
  it("routes the four meaningful Quick Create paths", () => {
    expect(routeQuickCreatePrompt({ productRefs: [], campaign: {} })).toBe("quick.image_only");
    expect(routeQuickCreatePrompt({
      productRefs: [{ uploadId, role: "hero" }],
      campaign: {},
    })).toBe("quick.product_only");
    expect(routeQuickCreatePrompt({ productRefs: [], campaign: { title: "Launch" } })).toBe("quick.campaign_only");
    expect(routeQuickCreatePrompt({
      productRefs: [{ uploadId, role: "hero" }],
      campaign: { title: "Launch" },
    })).toBe("quick.product_campaign");
  });

  it("renders the minimum image-only prompt without brand, mood, or product", () => {
    const input = buildQuick();
    const built = buildQuickCreatePrompt(input);

    expect(built.templateId).toBe("quick.image_only");
    expect(built.prompt).toContain("Create a clean studio image");
    expect(built.prompt).toContain("instagram post");
    expect(built.prompt).toContain("Do not render readable text");
    expect(built.prompt).toContain(NO_CROP_PROMPT_INSTRUCTION);
    expect(built.negativePrompt).toContain(NO_CROP_NEGATIVE_PROMPT);
    expect(built.overlaySlots).toEqual({});
  });

  it("adapts named characters and generated text requests for image-only prompts", () => {
    const input = buildQuick({
      brief: 'Ironman with a banner that says "We will rock you"',
    });
    const built = buildQuickCreatePrompt(input);

    expect(built.prompt).toContain("an original futuristic armored hero");
    expect(built.prompt).toContain("blank banner area reserved for renderer-owned text overlay");
    expect(built.prompt).not.toContain("Ironman");
    expect(built.prompt).not.toContain("We will rock you");
    expect(built.negativePrompt).toContain("copyrighted character");
  });

  it("keeps campaign text and selected logos in renderer-owned overlay slots", () => {
    const input = buildQuick({
      brandId,
      brandLogoAssetIds: [logoAssetId],
      campaign: { title: "Spring launch", subtitle: "Fresh arrivals", cta: "Shop now" },
      flags: { useBrandLogo: true, useBrandColors: true },
    });
    const built = buildQuickCreatePrompt({
      ...input,
      brand: { name: "Acme", palette: { primary: "#123456" } },
    });

    expect(built.templateId).toBe("quick.campaign_only");
    expect(built.prompt).toContain("Selected brand logos are exact overlay assets");
    expect(built.prompt).toContain("Do not draw, imitate, mutate, or replace the logo");
    expect(built.prompt).toContain("keep every product, package, label, and main subject fully inside the frame");
    expect(built.overlaySlots).toMatchObject({
      logoAssetIds: [logoAssetId],
      headline: "Spring launch",
      subtitle: "Fresh arrivals",
      cta: "Shop now",
    });
    expect(built.negativePrompt).toContain("fake logo");
  });
});
