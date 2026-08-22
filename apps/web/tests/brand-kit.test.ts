import { describe, expect, it } from "vitest";

import { contrastRatio, normalizeHex, readableInk } from "@/components/brands/kit/color";
import {
  draftFromBrand,
  emptyDraft,
  normalizeUrl,
  toBrandPatch,
} from "@/components/brands/kit/types";

describe("brand kit draft", () => {
  it("does not persist untouched preview defaults when the first name is saved", () => {
    const draft = { ...emptyDraft(), name: "Atlas Coffee" };

    expect(toBrandPatch(draft, new Set(["name"]))).toEqual({ name: "Atlas Coffee" });
    expect(draft.paletteConfigured).toBe(false);
    expect(draft.fontsConfigured).toBe(false);
  });

  it("groups the structured voice fields into the API shape", () => {
    const draft = {
      ...emptyDraft(),
      tone: ["warm", "direct"],
      avoid: ["synergy"],
      example: "Roasted last week.",
    };

    expect(toBrandPatch(draft, new Set(["tone", "avoid", "example"]))).toEqual({
      voice: {
        tone: ["warm", "direct"],
        avoid: ["synergy"],
        example: "Roasted last week.",
      },
    });
  });

  it("distinguishes stored brand data from preview fallbacks", () => {
    const draft = draftFromBrand({
      id: "brand-1",
      name: "Atlas",
      sourceUrl: null,
      descriptor: null,
      voiceNotes: null,
      voice: null,
      palette: null,
      fonts: null,
    });

    expect(draft.palette).toHaveLength(3);
    expect(draft.paletteConfigured).toBe(false);
    expect(draft.fontsConfigured).toBe(false);
  });
});

describe("brand kit value normalization", () => {
  it("normalizes URLs and complete three- or six-digit hex values", () => {
    expect(normalizeUrl(" atlas.example ")).toBe("https://atlas.example");
    expect(normalizeUrl("https://atlas.example")).toBe("https://atlas.example");
    expect(normalizeUrl("  ")).toBeNull();
    expect(normalizeHex("abc")).toBe("#aabbcc");
    expect(normalizeHex("#A1B2C3")).toBe("#a1b2c3");
    expect(normalizeHex("#12")).toBeNull();
  });

  it("calculates contrast and chooses a readable foreground", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(readableInk("#000000")).toBe("#ffffff");
    expect(readableInk("#ffffff")).toBe("#111111");
  });
});
