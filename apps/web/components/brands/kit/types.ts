import { resolveBrandFont, type BrandFontChoice } from "@layertone/shared/brand/fonts";

export type LogoVariant = "lockup" | "mark" | "wordmark" | "other";
export type LogoBackground = "light" | "dark" | "any";

export interface BrandKitAsset {
  id: string;
  kind: "logo" | "reference" | "icon";
  variant: LogoVariant;
  background: LogoBackground;
  label: string | null;
  isPrimary: boolean;
  url: string | null;
  width: number | null;
  height: number | null;
}

export interface BrandKitDraft {
  name: string;
  sourceUrl: string;
  descriptor: string;
  /** Index 0 is primary, 1 secondary, 2 accent, the rest extras. 3–6 entries. */
  palette: string[];
  /** Preview defaults are useful, but do not count as brand data until chosen. */
  paletteConfigured: boolean;
  fonts: { heading: BrandFontChoice; body: BrandFontChoice };
  fontsConfigured: boolean;
  voiceNotes: string;
  tone: string[];
  avoid: string[];
  example: string;
}

export interface BrandKitBrand {
  id: string;
  name: string;
  sourceUrl: string | null;
  descriptor: string | null;
  voiceNotes: string | null;
  voice: { tone?: string[]; avoid?: string[]; example?: string } | null;
  palette: { primary: string; secondary?: string; accent?: string; extras?: string[] } | null;
  fonts: {
    heading: { family: string; weight?: string };
    body: { family: string; weight?: string };
  } | null;
  createdAt?: string;
  generationCount?: number;
}

export const PALETTE_ROLES = ["Primary", "Secondary", "Accent", "Extra 1", "Extra 2", "Extra 3"];
export const MIN_PALETTE = 3;
export const MAX_PALETTE = 6;
export const MAX_LOGOS = 6;
export const MAX_REFERENCES = 10;

export const LOGO_VARIANT_LABELS: Record<LogoVariant, string> = {
  lockup: "Full lockup",
  mark: "Symbol only",
  wordmark: "Type only",
  other: "Other",
};

export const LOGO_BACKGROUND_LABELS: Record<LogoBackground, string> = {
  light: "For light artwork",
  dark: "For dark artwork",
  any: "Works on anything",
};

const STARTER_PALETTE = ["#242424", "#f6efe2", "#5e5ce6"];

export function emptyDraft(): BrandKitDraft {
  return {
    name: "",
    sourceUrl: "",
    descriptor: "",
    palette: [...STARTER_PALETTE],
    paletteConfigured: false,
    fonts: { heading: resolveBrandFont("heading"), body: resolveBrandFont("body") },
    fontsConfigured: false,
    voiceNotes: "",
    tone: [],
    avoid: [],
    example: "",
  };
}

export function draftFromBrand(brand: BrandKitBrand): BrandKitDraft {
  const palette = brand.palette
    ? [
        brand.palette.primary,
        brand.palette.secondary,
        brand.palette.accent,
        ...(brand.palette.extras ?? []),
      ]
        .filter((color): color is string => Boolean(color))
        .slice(0, MAX_PALETTE)
    : [];

  return {
    name: brand.name,
    sourceUrl: brand.sourceUrl ?? "",
    descriptor: brand.descriptor ?? "",
    palette: palette.length >= MIN_PALETTE ? palette : [...STARTER_PALETTE],
    paletteConfigured: palette.length >= MIN_PALETTE,
    fonts: {
      heading: resolveBrandFont("heading", brand.fonts?.heading),
      body: resolveBrandFont("body", brand.fonts?.body),
    },
    fontsConfigured: brand.fonts !== null,
    voiceNotes: brand.voiceNotes ?? "",
    tone: brand.voice?.tone ?? [],
    avoid: brand.voice?.avoid ?? [],
    example: brand.voice?.example ?? "",
  };
}

/**
 * The PATCH body for /api/brands/[id]. Passing fields keeps the create screen
 * from storing preview defaults that the user never chose.
 */
export function toBrandPatch(
  draft: BrandKitDraft,
  fields?: ReadonlySet<keyof BrandKitDraft>,
): Record<string, unknown> {
  const [primary, secondary, accent, ...extras] = draft.palette;
  const voice = {
    ...(draft.tone.length ? { tone: draft.tone } : {}),
    ...(draft.avoid.length ? { avoid: draft.avoid } : {}),
    ...(draft.example.trim() ? { example: draft.example.trim() } : {}),
  };
  const includes = (...names: (keyof BrandKitDraft)[]) =>
    fields === undefined || names.some((name) => fields.has(name));

  return {
    ...(includes("name") ? { name: draft.name.trim() } : {}),
    ...(includes("sourceUrl") ? { sourceUrl: normalizeUrl(draft.sourceUrl) } : {}),
    ...(includes("descriptor") ? { descriptor: draft.descriptor.trim() || null } : {}),
    ...(includes("palette")
      ? {
          palette: {
            primary: primary ?? "#242424",
            ...(secondary ? { secondary } : {}),
            ...(accent ? { accent } : {}),
            extras,
          },
        }
      : {}),
    ...(includes("fonts") ? { fonts: draft.fonts } : {}),
    ...(includes("voiceNotes") ? { voiceNotes: draft.voiceNotes } : {}),
    ...(includes("tone", "avoid", "example")
      ? { voice: Object.keys(voice).length ? voice : null }
      : {}),
  };
}

export function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
  /** What the generator does when this is missing. */
  consequence: string;
}

/** What the kit still owes the renderer, phrased as consequences rather than scolding. */
export function checklist(draft: BrandKitDraft, assets: BrandKitAsset[]): ChecklistItem[] {
  const logos = assets.filter((asset) => asset.kind === "logo");
  const hasDark = logos.some((logo) => logo.background === "dark" || logo.background === "any");
  const references = assets.filter((asset) => asset.kind === "reference");

  return [
    {
      label: "Brand name",
      done: draft.name.trim().length > 0,
      consequence: "Nothing can be generated without it.",
    },
    {
      label: "A logo",
      done: logos.length > 0,
      consequence:
        "Artwork is generated with a clear space where a logo would go, and nothing in it.",
    },
    {
      label: "A logo for dark artwork",
      done: logos.length > 0 && hasDark,
      consequence: "Dark backgrounds fall back to the primary logo, which may disappear into them.",
    },
    {
      label: "Three or more colours",
      done: draft.paletteConfigured && draft.palette.filter(Boolean).length >= MIN_PALETTE,
      consequence: "Text and CTA colours are picked by the template instead of by you.",
    },
    {
      label: "Typography",
      done: draft.fontsConfigured && Boolean(draft.fonts.heading.family && draft.fonts.body.family),
      consequence: "Headlines render in Inter.",
    },
    {
      label: "Voice notes",
      done: draft.voiceNotes.trim().length > 0 || draft.tone.length > 0,
      consequence: "Captions and campaign copy are written in a generic register.",
    },
    {
      label: "Reference images",
      done: references.length > 0,
      consequence: "Backgrounds are grounded in the brief alone, not in how your brand looks.",
    },
  ];
}
