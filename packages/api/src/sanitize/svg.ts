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
