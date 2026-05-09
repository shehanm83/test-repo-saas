import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

import { PromptTemplateSchema, type PromptTemplate } from "./schema";

const TEMPLATE_PATHS: Record<string, string> = {
  "quick.image_only": "templates/quick/image-only.yaml",
  "quick.product_only": "templates/quick/product-only.yaml",
  "quick.campaign_only": "templates/quick/campaign-only.yaml",
  "quick.product_campaign": "templates/quick/product-campaign.yaml",
  "modifier.brand_basic": "templates/modifiers/brand-basic.yaml",
  "modifier.brand_logo_overlay": "templates/modifiers/brand-logo-overlay.yaml",
  "modifier.mood_selected": "templates/modifiers/mood-selected.yaml",
  "modifier.format_social_post": "templates/modifiers/format-social-post.yaml",
  "modifier.format_vertical": "templates/modifiers/format-vertical.yaml",
  "modifier.format_profile_cover": "templates/modifiers/format-profile-cover.yaml",
  "modifier.format_general_image": "templates/modifiers/format-general-image.yaml",
};

const cache = new Map<string, PromptTemplate>();
const here = dirname(fileURLToPath(import.meta.url));

export function loadPromptTemplate(id: string): PromptTemplate {
  const cached = cache.get(id);
  if (cached) return cached;

  const relativePath = TEMPLATE_PATHS[id];
  if (!relativePath) throw new Error(`prompt-template-not-found:${id}`);
  const filePath = resolveTemplateFile(relativePath);
  const raw = readFileSync(filePath, "utf8");
  const parsed = PromptTemplateSchema.parse(parse(raw));
  if (parsed.id !== id) {
    throw new Error(`prompt-template-id-mismatch:${id}:${parsed.id}`);
  }
  cache.set(id, parsed);
  return parsed;
}

function resolveTemplateFile(relativePath: string) {
  const candidates = [
    join(here, relativePath),
    join(here, "../../src/prompt-templates", relativePath),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`prompt-template-file-not-found:${relativePath}`);
  return found;
}
