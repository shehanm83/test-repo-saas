import type { ResolvedOutputTarget } from "../output-targets";
import type { NormalizedCommercialGenerationInput } from "../generation/commercial-contract";
import { loadPromptTemplate } from "./loader";
import { compactPrompt, renderPromptString } from "./renderer";
import type { BuiltPrompt, PromptOverlaySlots, PromptTemplate } from "./schema";

type ProductRef = NormalizedCommercialGenerationInput["productRefs"][number];
type Campaign = NormalizedCommercialGenerationInput["campaign"];

export interface QuickCreatePromptBrand {
  name?: string | null;
  palette?: unknown;
  fonts?: unknown;
  voiceNotes?: string | null;
}

export interface QuickCreatePromptMood {
  name?: string | null;
  promptModifiers?: string | null;
  negativePrompts?: string | null;
  accentPalette?: string[] | null;
  decorationTags?: string[] | null;
}

export interface BuildQuickCreatePromptInput {
  normalized: NormalizedCommercialGenerationInput;
  outputTarget: ResolvedOutputTarget;
  brand?: QuickCreatePromptBrand | null;
  mood?: QuickCreatePromptMood | null;
  outputFormat?: string | null;
  variantIndex?: number;
}

export function routeQuickCreatePrompt(input: Pick<NormalizedCommercialGenerationInput, "productRefs" | "campaign">): string {
  const hasProduct = input.productRefs.length > 0;
  const hasCampaign = hasCampaignDetails(input.campaign);
  if (hasProduct && hasCampaign) return "quick.product_campaign";
  if (hasProduct) return "quick.product_only";
  if (hasCampaign) return "quick.campaign_only";
  return "quick.image_only";
}

export function buildQuickCreatePrompt(input: BuildQuickCreatePromptInput): BuiltPrompt {
  if (input.normalized.mode !== "quick" && input.normalized.mode !== "campaign_builder") {
    throw new Error(`prompt-template-mode-not-supported:${input.normalized.mode}`);
  }

  const baseId = routeQuickCreatePrompt(input.normalized);
  const base = loadPromptTemplate(baseId);
  const modifiers = selectModifiers(input).map(loadPromptTemplate);
  const templates = [base, ...modifiers];
  const context = buildContext(input);
  validateRequiredVariables(base, context);

  const prompt = compactPrompt(
    templates
      .map((template) => renderPromptString(template.prompt, context))
      .filter(Boolean)
      .join("\n\n"),
  );
  const negativePrompt = compactPrompt(
    templates
      .map((template) => template.negative_prompt ? renderPromptString(template.negative_prompt, context) : "")
      .filter(Boolean)
      .join("\n"),
  );

  return {
    templateId: base.id,
    templateVersion: base.version,
    path: base.id,
    prompt,
    ...(negativePrompt ? { negativePrompt } : {}),
    overlaySlots: buildOverlaySlots(input.normalized),
    modelInstructions: {
      compatibleModels: base.compatible_models,
      safetyRules: unique(templates.flatMap((template) => template.safety_rules)),
    },
  };
}

function selectModifiers(input: BuildQuickCreatePromptInput) {
  const modifiers: string[] = [];
  const { normalized, brand, mood, outputTarget } = input;
  if (brand && (normalized.flags.useBrandColors || normalized.flags.useBrandFonts)) {
    modifiers.push("modifier.brand_basic");
  }
  if (brand && normalized.flags.useBrandLogo && normalized.brandLogoAssetIds.length > 0) {
    modifiers.push("modifier.brand_logo_overlay");
  }
  if (mood) modifiers.push("modifier.mood_selected");

  if (outputTarget.aspectRatio === "9:16") {
    modifiers.push("modifier.format_vertical");
  } else if (outputTarget.platform === "facebook" && ["profile_photo", "cover_photo"].includes(outputTarget.format ?? "")) {
    modifiers.push("modifier.format_profile_cover");
  } else if (outputTarget.kind === "social") {
    modifiers.push("modifier.format_social_post");
  } else {
    modifiers.push("modifier.format_general_image");
  }
  return modifiers;
}

function buildContext(input: BuildQuickCreatePromptInput) {
  const { normalized, outputTarget, brand, mood } = input;
  return {
    brief: sanitizeUserDirection(normalized.brief),
    product_summary: summarizeProducts(normalized.productRefs),
    campaign_summary: summarizeCampaign(normalized.campaign),
    composition_summary: summarizeComposition(normalized.composition),
    brand_summary: summarizeBrand(brand),
    mood_summary: summarizeMood(mood),
    overlay_summary: summarizeOverlay(buildOverlaySlots(normalized)),
    product: normalized.productRefs[0]?.commercialFields ?? {},
    campaign: normalized.campaign,
    composition: normalized.composition,
    brand: {
      name: brand?.name ?? "",
      palette: brand?.palette ?? "",
      fonts: brand?.fonts ?? "",
      voice_notes: brand?.voiceNotes ?? "",
      selected_logo_asset_ids: normalized.brandLogoAssetIds,
      flags: {
        use_colors: normalized.flags.useBrandColors,
        use_logo: normalized.flags.useBrandLogo,
        use_fonts: normalized.flags.useBrandFonts,
        brand_strict: normalized.flags.brandStrict,
      },
    },
    mood: {
      name: mood?.name ?? "",
      prompt_modifiers: mood?.promptModifiers ?? "",
      accent_palette: mood?.accentPalette ?? [],
      decoration_tags: mood?.decorationTags ?? [],
    },
    output: {
      format: input.outputFormat ?? normalized.outputs.formats[0] ?? "",
      platform: outputTarget.platform ?? "image",
      platform_label: platformLabel(outputTarget),
      width: outputTarget.width,
      height: outputTarget.height,
      aspect_ratio: outputTarget.aspectRatio,
      variant_index: input.variantIndex ?? 0,
    },
  };
}

function sanitizeUserDirection(brief: string) {
  return brief
    .replaceAll(/\biron\s*-?\s*man\b/gi, "an original futuristic armored hero")
    .replaceAll(/\bspider\s*-?\s*man\b/gi, "an original agile masked hero")
    .replaceAll(/\bbat\s*-?\s*man\b/gi, "an original dark tactical hero")
    .replaceAll(/\bsuper\s*-?\s*man\b/gi, "an original heroic flying figure")
    .replaceAll(
      /\b(says|reads|text|caption)\s*[:=]?\s*["“][^"”]+["”]/gi,
      "has a blank banner area reserved for renderer-owned text overlay",
    )
    .replaceAll(
      /["“][^"”]{1,120}["”]/g,
      "a blank banner area reserved for renderer-owned text overlay",
    );
}

function validateRequiredVariables(template: PromptTemplate, context: Record<string, unknown>) {
  const missing = template.variables.required.filter((path) => isEmpty(readPath(context, path)));
  if (missing.length > 0) {
    throw new Error(`prompt-template-missing-vars:${template.id}:${missing.join(",")}`);
  }
}

function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

function isEmpty(value: unknown) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function hasCampaignDetails(campaign: Campaign) {
  return Object.values(campaign).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

function summarizeProducts(products: ProductRef[]) {
  if (products.length === 0) return "No specific product is selected.";
  return products
    .map((ref, index) => {
      const product = ref.commercialFields ?? {};
      const productName = product.title ?? product.name;
      const parts = [
        productName ? `name: ${productName}` : null,
        product.subtitle ? `subtitle: ${product.subtitle}` : null,
        product.category ? `category: ${product.category}` : null,
        product.description ? `description: ${product.description}` : null,
        product.keyFeatures?.length ? `features: ${product.keyFeatures.join(", ")}` : null,
        product.benefits?.length ? `benefits: ${product.benefits.join(", ")}` : null,
        product.targetAudience ? `audience: ${product.targetAudience}` : null,
      ].filter(Boolean);
      return `Product ${index + 1} (${ref.role}): ${parts.join("; ") || "selected product asset"}`;
    })
    .join("\n");
}

function summarizeCampaign(campaign: Campaign) {
  const parts = [
    campaign.title ? `title: ${campaign.title}` : null,
    campaign.subtitle ? `subtitle: ${campaign.subtitle}` : null,
    campaign.message ? `message: ${campaign.message}` : null,
    campaign.price ? `price overlay: ${campaign.price}` : null,
    campaign.discount ? `discount overlay: ${campaign.discount}` : null,
    campaign.badgeText ? `badge overlay: ${campaign.badgeText}` : null,
    campaign.cta ? `CTA overlay: ${campaign.cta}` : null,
    campaign.targetAudience ? `target audience: ${campaign.targetAudience}` : null,
    campaign.benefits?.length ? `benefits: ${campaign.benefits.join(", ")}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : "No campaign details are selected.";
}

function summarizeComposition(composition: NormalizedCommercialGenerationInput["composition"]) {
  return [
    `background: ${composition.backgroundStyle}`,
    `realism: ${composition.realism}`,
    `product size: ${composition.productSize}`,
    `product position: ${composition.productPosition}`,
    `label visibility: ${composition.labelVisibility}`,
    `packaging: ${composition.packagingVisibility}`,
    `brand blend: ${composition.brandBlend}`,
  ].join("; ");
}

function summarizeBrand(brand: QuickCreatePromptBrand | null | undefined) {
  if (!brand) return "No brand is selected.";
  return [
    brand.name ? `brand: ${brand.name}` : null,
    brand.palette ? `palette: ${JSON.stringify(brand.palette)}` : null,
    brand.fonts ? `fonts: ${JSON.stringify(brand.fonts)}` : null,
    brand.voiceNotes ? `voice: ${brand.voiceNotes}` : null,
  ].filter(Boolean).join("; ");
}

function summarizeMood(mood: QuickCreatePromptMood | null | undefined) {
  if (!mood) return "No mood is selected.";
  return [
    mood.name ? `mood: ${mood.name}` : null,
    mood.promptModifiers ? mood.promptModifiers : null,
    mood.accentPalette?.length ? `accent palette: ${mood.accentPalette.join(", ")}` : null,
    mood.decorationTags?.length ? `decorations: ${mood.decorationTags.join(", ")}` : null,
  ].filter(Boolean).join("; ");
}

function summarizeOverlay(slots: PromptOverlaySlots) {
  const keys = Object.entries(slots)
    .filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value))
    .map(([key]) => key);
  return keys.length ? `Renderer overlay slots: ${keys.join(", ")}.` : "No exact overlay text or logo slots are requested.";
}

function buildOverlaySlots(normalized: NormalizedCommercialGenerationInput): PromptOverlaySlots {
  const campaign = normalized.campaign;
  return {
    ...(normalized.flags.useBrandLogo && normalized.brandLogoAssetIds.length > 0
      ? { logoAssetIds: normalized.brandLogoAssetIds }
      : {}),
    ...(campaign.title ? { headline: campaign.title } : {}),
    ...(campaign.subtitle ? { subtitle: campaign.subtitle } : {}),
    ...(campaign.price ? { price: campaign.price } : {}),
    ...(campaign.discount ? { discount: campaign.discount } : {}),
    ...(campaign.badgeText ? { badgeText: campaign.badgeText } : {}),
    ...(campaign.cta ? { cta: campaign.cta } : {}),
    ...(campaign.legalText ? { legalText: campaign.legalText } : {}),
    ...(campaign.website ? { website: campaign.website } : {}),
    ...(campaign.phone ? { phone: campaign.phone } : {}),
    ...(campaign.qrUrl ? { qrUrl: campaign.qrUrl } : {}),
  };
}

function platformLabel(target: ResolvedOutputTarget) {
  return target.platform ? `${target.platform} ${target.format ?? ""}`.trim() : `image ${target.aspectRatio}`;
}

function unique(values: string[]) {
  return [...new Set(values)];
}
