import { describe, expect, it } from "vitest";

import { QuickCreatePlan, QuickCreatePlanRequest } from "./quick-create-v2";

describe("Quick Create V2 contract", () => {
  it("keeps facts separate from inferred suggestions and requires auditable variants", () => {
    const parsed = QuickCreatePlan.parse({
      version: 1,
      facts: {
        request: "Show Acme Serum with the exact headline Glow now",
        products: ["Acme Serum"],
        claims: [],
        exactCopy: { headline: "Glow now" },
        explicitConstraints: ["Keep the bottle exact"],
      },
      suggestions: {
        subject: "Acme Serum",
        scene: "Studio",
        action: "Hero pose",
        audience: "Adults",
        visualStyle: "Editorial",
        composition: "Centered",
        copyIntent: "Headline overlay",
        constraints: [],
      },
      clarification: null,
      moodRecommendations: [],
      variants: [
        {
          version: 1,
          index: 0,
          label: "Studio hero",
          concept: "Clean product hero",
          composition: "Centered",
          camera: "Eye-level",
          lighting: "Softbox",
          artDirection: "Minimal",
          seed: 123,
          locks: { identity: true, claims: true, exactCopy: true, brand: true, mood: false },
          moodRecipe: null,
        },
      ],
    });
    expect(parsed.facts.exactCopy.headline).toBe("Glow now");
    expect(parsed.variants[0]?.seed).toBe(123);
  });

  it("limits the planner to four deliberate directions", () => {
    expect(() =>
      QuickCreatePlanRequest.parse({
        request: "Create an image",
        outputTarget: { kind: "image", aspectRatio: "1:1" },
        sampleCount: 5,
      }),
    ).toThrow();
  });
});
