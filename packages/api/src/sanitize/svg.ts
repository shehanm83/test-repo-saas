import DOMPurify from "isomorphic-dompurify";
import { optimize } from "svgo";

const FORBIDDEN_TAGS = ["script", "foreignObject", "iframe", "object", "embed", "use"];

export function sanitizeSvg(input: string): string {
  const cleaned = DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: ["onload", "onclick", "onerror", "href", "xlink:href"],
  });

  const optimized = optimize(cleaned, {
    plugins: ["removeXMLProcInst", "removeComments", "removeMetadata"],
  });

  return optimized.data;
}

/**
 * Intrinsic pixel dimensions of an SVG, from width/height when they are plain
 * pixel values, otherwise from the viewBox. Returns null when neither is usable —
 * the renderer can scale a viewBox-less SVG, but callers should not invent a size.
 */
export function svgDimensions(svg: string): { width: number; height: number } | null {
  const attr = (name: string): number | null => {
    const raw = svg.match(new RegExp(`<svg[^>]*\\s${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
    if (!raw) return null;
    const value = Number.parseFloat(raw.trim().replace(/px$/i, ""));
    return Number.isFinite(value) && value > 0 && /^[\d.]+(px)?$/i.test(raw.trim())
      ? Math.round(value)
      : null;
  };

  const width = attr("width");
  const height = attr("height");
  if (width && height) return { width, height };

  const viewBox = svg.match(/<svg[^>]*\sviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!viewBox) return null;
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [, , vbWidth, vbHeight] = parts as [number, number, number, number];
  if (vbWidth <= 0 || vbHeight <= 0) return null;
  return { width: Math.round(vbWidth), height: Math.round(vbHeight) };
}
