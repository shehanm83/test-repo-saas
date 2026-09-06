/**
 * The fonts a brand kit is allowed to use.
 *
 * The renderer resolves brand type at render time from the Google Fonts css2
 * endpoint and throws `font-not-found:<family>:<weight>` when the pair does not
 * exist (packages/renderer/src/fonts.ts). A font picked in a settings screen
 * must therefore never be able to fail a paid generation an hour later — every
 * family and weight below was probed against that exact endpoint.
 *
 * Regenerate with scripts/probe-brand-fonts.mjs when adding families.
 */

export type BrandFontCategory = "sans" | "serif" | "slab" | "display" | "mono" | "handwriting";

export interface BrandFont {
  readonly family: string;
  readonly category: BrandFontCategory;
  /** Weights the renderer can actually fetch, ascending. */
  readonly weights: readonly string[];
}

export interface BrandFontChoice {
  family: string;
  weight: string;
}

export type BrandFontRole = "heading" | "body";

export const BRAND_FONT_CATEGORY_LABELS: Record<BrandFontCategory, string> = {
  sans: "Sans-serif",
  serif: "Serif",
  slab: "Slab serif",
  display: "Display",
  mono: "Monospace",
  handwriting: "Handwriting",
};

export const BRAND_FONTS: readonly BrandFont[] = [
  { family: "Archivo", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Assistant", category: "sans", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Barlow", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Cabin", category: "sans", weights: ["400", "500", "600", "700"] },
  { family: "DM Sans", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Epilogue", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Figtree", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Hanken Grotesk", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Inter", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Josefin Sans", category: "sans", weights: ["300", "400", "500", "600", "700"] },
  { family: "Karla", category: "sans", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Lato", category: "sans", weights: ["300", "400", "700", "900"] },
  { family: "Lexend", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Manrope", category: "sans", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Montserrat", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Mulish", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Noto Sans", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Nunito", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Nunito Sans", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Open Sans", category: "sans", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Outfit", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Plus Jakarta Sans", category: "sans", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Poppins", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Public Sans", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Raleway", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Roboto", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Rubik", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Sora", category: "sans", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Source Sans 3", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Space Grotesk", category: "sans", weights: ["300", "400", "500", "600", "700"] },
  { family: "Urbanist", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Work Sans", category: "sans", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Bitter", category: "serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Cormorant Garamond", category: "serif", weights: ["300", "400", "500", "600", "700"] },
  { family: "Crimson Pro", category: "serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "DM Serif Display", category: "serif", weights: ["400"] },
  { family: "DM Serif Text", category: "serif", weights: ["400"] },
  { family: "EB Garamond", category: "serif", weights: ["400", "500", "600", "700", "800"] },
  { family: "Frank Ruhl Libre", category: "serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Fraunces", category: "serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Libre Baskerville", category: "serif", weights: ["400", "500", "600", "700"] },
  { family: "Literata", category: "serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Lora", category: "serif", weights: ["400", "500", "600", "700"] },
  { family: "Merriweather", category: "serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Newsreader", category: "serif", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Noto Serif", category: "serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "PT Serif", category: "serif", weights: ["400", "700"] },
  { family: "Playfair", category: "serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Playfair Display", category: "serif", weights: ["400", "500", "600", "700", "800", "900"] },
  { family: "Source Serif 4", category: "serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Spectral", category: "serif", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Arvo", category: "slab", weights: ["400", "700"] },
  { family: "Josefin Slab", category: "slab", weights: ["300", "400", "500", "600", "700"] },
  { family: "Roboto Slab", category: "slab", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Zilla Slab", category: "slab", weights: ["300", "400", "500", "600", "700"] },
  { family: "Abril Fatface", category: "display", weights: ["400"] },
  { family: "Alfa Slab One", category: "display", weights: ["400"] },
  { family: "Anton", category: "display", weights: ["400"] },
  { family: "Archivo Black", category: "display", weights: ["400"] },
  { family: "Bebas Neue", category: "display", weights: ["400"] },
  { family: "Chivo", category: "display", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Fjalla One", category: "display", weights: ["400"] },
  { family: "Oswald", category: "display", weights: ["300", "400", "500", "600", "700"] },
  { family: "Righteous", category: "display", weights: ["400"] },
  { family: "Staatliches", category: "display", weights: ["400"] },
  { family: "Teko", category: "display", weights: ["300", "400", "500", "600", "700"] },
  { family: "Fira Code", category: "mono", weights: ["300", "400", "500", "600", "700"] },
  { family: "IBM Plex Mono", category: "mono", weights: ["300", "400", "500", "600", "700"] },
  { family: "JetBrains Mono", category: "mono", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Roboto Mono", category: "mono", weights: ["300", "400", "500", "600", "700"] },
  { family: "Source Code Pro", category: "mono", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Space Mono", category: "mono", weights: ["400", "700"] },
  { family: "Caveat", category: "handwriting", weights: ["400", "500", "600", "700"] },
  { family: "Dancing Script", category: "handwriting", weights: ["400", "500", "600", "700"] },
  { family: "Lobster", category: "handwriting", weights: ["400"] },
  { family: "Pacifico", category: "handwriting", weights: ["400"] },
  { family: "Satisfy", category: "handwriting", weights: ["400"] },
];

const BY_FAMILY = new Map(BRAND_FONTS.map((font) => [font.family.toLowerCase(), font]));

/** The weight each role wants when the family publishes it. */
const PREFERRED_WEIGHT: Record<BrandFontRole, string> = { heading: "700", body: "400" };

export const DEFAULT_BRAND_FONTS: Record<BrandFontRole, BrandFontChoice> = {
  heading: { family: "Inter", weight: "700" },
  body: { family: "Inter", weight: "400" },
};

export function findBrandFont(family: string): BrandFont | undefined {
  return BY_FAMILY.get(family.trim().toLowerCase());
}

export function isSupportedBrandFont(family: string, weight?: string): boolean {
  const font = findBrandFont(family);
  if (!font) return false;
  return weight === undefined || font.weights.includes(weight);
}

/**
 * The closest weight the family actually publishes — Anton ships 400 only, so a
 * heading asking for 700 gets 400 rather than a render-time failure.
 */
export function nearestBrandFontWeight(font: BrandFont, wanted: string): string {
  if (font.weights.includes(wanted)) return wanted;
  const target = Number.parseInt(wanted, 10);
  const fallback = font.weights[0] ?? "400";
  if (!Number.isFinite(target)) return fallback;
  return font.weights.reduce((best, candidate) => {
    const distance = Math.abs(Number.parseInt(candidate, 10) - target);
    const bestDistance = Math.abs(Number.parseInt(best, 10) - target);
    return distance < bestDistance ? candidate : best;
  }, fallback);
}

/**
 * Coerces a stored or user-supplied choice into something the renderer can serve.
 * Unknown families fall back to the role default rather than being repaired —
 * silently rendering an unrelated family would be worse than an honest default.
 */
export function resolveBrandFont(
  role: BrandFontRole,
  choice?: { family?: string | null; weight?: string | null } | null,
): BrandFontChoice {
  const font = choice?.family ? findBrandFont(choice.family) : undefined;
  if (!font) return { ...DEFAULT_BRAND_FONTS[role] };
  return {
    family: font.family,
    weight: nearestBrandFontWeight(font, choice?.weight ?? PREFERRED_WEIGHT[role]),
  };
}

/**
 * Google Fonts stylesheet URL for previewing families in the browser.
 *
 * Pass a weight to fetch just that one (snapped per family) — a grid of 77
 * samples has no use for nine weights of each.
 */
export function brandFontStylesheetUrl(
  families: readonly string[],
  weight?: string,
): string | null {
  const seen = new Set<string>();
  const specs: string[] = [];
  for (const family of families) {
    const font = findBrandFont(family);
    if (!font || seen.has(font.family)) continue;
    seen.add(font.family);
    const wanted = weight ? [nearestBrandFontWeight(font, weight)] : font.weights;
    specs.push(`${font.family.replace(/ /g, "+")}:wght@${wanted.join(";")}`);
  }
  if (specs.length === 0) return null;
  return `https://fonts.googleapis.com/css2?family=${specs.join("&family=")}&display=swap`;
}
