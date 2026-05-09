import { z } from "zod";

import type { ResolvedOutputTarget } from "../output-targets";

const UUID = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const CreationType = z.enum([
  "single_product",
  "product_bundle",
  "campaign_set",
  "leaflet_catalogue",
  "comparison",
  "social_ad_pack",
]);

export const ProductRole = z.enum([
  "hero",
  "bundle_item",
  "catalogue_item",
  "before",
  "after",
]);

export const OutputFormat = z.enum([
  "instagram_square",
  "instagram_portrait",
  "instagram_landscape",
  "instagram_story",
  "instagram_reel",
  "instagram_feed_video_portrait",
  "instagram_feed_video_square",
  "facebook_feed",
  "facebook_square",
  "facebook_portrait",
  "facebook_landscape",
  "facebook_link_preview",
  "facebook_profile_photo",
  "facebook_cover_photo",
  "facebook_story",
  "linkedin_feed",
  "tiktok_vertical",
  "website_banner",
  "product_card",
  "ad_creative",
  "print_leaflet_a4",
]);

export const ProductSnapshot = z.object({
  name: z.string().min(1).max(180).optional(),
  title: z.string().max(180).optional(),
  subtitle: z.string().max(240).optional(),
  description: z.string().max(3000).optional(),
  brandLabel: z.string().max(120).optional(),
  model: z.string().max(120).optional(),
  sku: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  priceMinor: z.number().int().nonnegative().optional(),
  compareAtPriceMinor: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  discountText: z.string().max(80).optional(),
  keyFeatures: z.array(z.string().min(1).max(160)).max(12).optional(),
  benefits: z.array(z.string().min(1).max(160)).max(12).optional(),
  targetAudience: z.string().max(500).optional(),
});

export const ProductRef = z.object({
  productId: UUID.optional(),
  uploadId: UUID.optional(),
  role: ProductRole,
  commercialFields: ProductSnapshot.optional(),
});

export const CampaignDetails = z.object({
  title: z.string().max(180).optional(),
  subtitle: z.string().max(240).optional(),
  message: z.string().max(500).optional(),
  price: z.string().max(80).optional(),
  discount: z.string().max(80).optional(),
  badgeText: z.string().max(80).optional(),
  cta: z.string().max(80).optional(),
  offerExpiry: z.string().max(80).optional(),
  legalText: z.string().max(500).optional(),
  website: z.string().max(200).optional(),
  phone: z.string().max(80).optional(),
  qrUrl: z.string().max(500).optional(),
  benefits: z.array(z.string().min(1).max(160)).max(12).optional(),
  targetAudience: z.string().max(500).optional(),
});

export const TemplateSelection = z.object({
  family: z.string().min(1).max(80),
  layout: z.string().min(1).max(80),
  templateId: UUID.optional(),
});

export const CompositionControls = z.object({
  productSize: z.enum(["small", "balanced", "dominant"]),
  productPosition: z.enum(["center", "left", "right", "bottom", "template"]),
  backgroundStyle: z.enum([
    "studio",
    "lifestyle",
    "abstract",
    "seasonal",
    "marketplace_white",
    "transparent",
  ]),
  realism: z.enum(["clean_render", "realistic_photo", "premium_editorial", "commercial_3d"]),
  shadowReflection: z.enum(["none", "soft_shadow", "hard_shadow", "reflection"]),
  labelVisibility: z.enum(["hide", "preserve", "emphasize"]),
  packagingVisibility: z.enum(["product_only", "packaging_only", "both"]),
  keepOriginalShape: z.boolean(),
  brandBlend: z.enum(["low", "medium", "high"]),
});

export const OutputSettings = z.object({
  variants: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  quality: z.enum(["standard", "premium"]),
  consistency: z.enum(["off", "same_mood", "strict_campaign"]),
  formats: z.array(OutputFormat).min(1).max(12),
});

const LegacyInput = z.object({
  brandId: UUID,
  moodId: UUID.optional().nullable(),
  brief: z.string().min(1).max(500),
  outputTarget: z.unknown(),
  inspirationUploadId: UUID.optional(),
  inspirationUploadIds: z.array(UUID).max(5).optional(),
  inspirationInfluence: z.enum(["subtle", "balanced", "strong"]).optional(),
  flags: z
    .object({
      useBrandColors: z.boolean().default(true),
      useBrandLogo: z.boolean().default(true),
      useBrandFonts: z.boolean().default(true),
      brandStrict: z.boolean().default(false),
      applyMoodModifiers: z.boolean().default(true),
      applyMoodDecorations: z.boolean().default(true),
      applyMoodAccentColors: z.boolean().default(true),
      usePremiumModel: z.boolean().default(false),
      tier: z.enum(["standard", "premium"]).optional(),
      strength: z.string().optional(),
      selectedModelCodes: z.array(z.string()).max(8).optional(),
    })
    .partial()
    .default({}),
  numVariants: z.number().int().min(1).max(4).optional(),
});

const CommercialInput = z.object({
  mode: z.enum(["quick", "campaign_builder"]),
  creationType: CreationType,
  brandId: UUID.optional().nullable(),
  projectId: UUID.optional().nullable(),
  moodId: UUID.optional().nullable(),
  brief: z.string().min(1).max(500).optional(),
  outputTarget: z.unknown().optional(),
  productRefs: z.array(ProductRef).max(40).default([]),
  brandLogoAssetIds: z.array(UUID).max(5).default([]),
  campaign: CampaignDetails.default({}),
  template: TemplateSelection.default({ family: "product_hero", layout: "centered_product_hero" }),
  composition: CompositionControls.default({
    productSize: "balanced",
    productPosition: "template",
    backgroundStyle: "studio",
    realism: "realistic_photo",
    shadowReflection: "soft_shadow",
    labelVisibility: "preserve",
    packagingVisibility: "product_only",
    keepOriginalShape: true,
    brandBlend: "medium",
  }),
  outputs: OutputSettings,
  inspirationInfluence: z.enum(["subtle", "balanced", "strong"]).optional(),
  flags: LegacyInput.shape.flags,
});

export type CommercialGenerationInput = z.infer<typeof CommercialInput>;
export type NormalizedCommercialGenerationInput = {
  mode: "legacy" | "quick" | "campaign_builder";
  creationType: z.infer<typeof CreationType>;
  brandId: string | null;
  projectId: string | null;
  moodId: string | null;
  brief: string;
  outputTarget: unknown;
  productRefs: z.infer<typeof ProductRef>[];
  brandLogoAssetIds: string[];
  campaign: z.infer<typeof CampaignDetails>;
  template: z.infer<typeof TemplateSelection>;
  composition: z.infer<typeof CompositionControls>;
  outputs: z.infer<typeof OutputSettings>;
  inspirationUploadIds: string[];
  inspirationInfluence?: "subtle" | "balanced" | "strong";
  flags: {
    useBrandColors: boolean;
    useBrandLogo: boolean;
    useBrandFonts: boolean;
    brandStrict: boolean;
    applyMoodModifiers: boolean;
    applyMoodDecorations: boolean;
    applyMoodAccentColors: boolean;
    usePremiumModel: boolean;
    tier?: "standard" | "premium";
    strength?: string;
    selectedModelCodes?: string[];
  };
};

export const OUTPUT_FORMAT_TARGETS: Record<z.infer<typeof OutputFormat>, unknown> = {
  instagram_square: { kind: "social", platform: "instagram", format: "post" },
  instagram_portrait: { kind: "social", platform: "instagram", format: "post_portrait" },
  instagram_landscape: { kind: "social", platform: "instagram", format: "post_landscape" },
  instagram_story: { kind: "social", platform: "instagram", format: "story" },
  instagram_reel: { kind: "social", platform: "instagram", format: "reel" },
  instagram_feed_video_portrait: { kind: "social", platform: "instagram", format: "feed_video_portrait" },
  instagram_feed_video_square: { kind: "social", platform: "instagram", format: "feed_video_square" },
  facebook_feed: { kind: "social", platform: "facebook", format: "post" },
  facebook_square: { kind: "social", platform: "facebook", format: "post_square" },
  facebook_portrait: { kind: "social", platform: "facebook", format: "post_portrait" },
  facebook_landscape: { kind: "social", platform: "facebook", format: "post_landscape" },
  facebook_link_preview: { kind: "social", platform: "facebook", format: "link_preview" },
  facebook_profile_photo: { kind: "social", platform: "facebook", format: "profile_photo" },
  facebook_cover_photo: { kind: "social", platform: "facebook", format: "cover_photo" },
  facebook_story: { kind: "social", platform: "facebook", format: "story" },
  linkedin_feed: { kind: "social", platform: "linkedin", format: "post" },
  tiktok_vertical: { kind: "social", platform: "tiktok", format: "video" },
  website_banner: { kind: "image", aspectRatio: "16:9" },
  product_card: { kind: "image", aspectRatio: "1:1" },
  ad_creative: { kind: "social", platform: "instagram", format: "post_portrait" },
  print_leaflet_a4: { kind: "image", aspectRatio: "4:5" },
};

const defaultFlags = {
  useBrandColors: true,
  useBrandLogo: true,
  useBrandFonts: true,
  brandStrict: false,
  applyMoodModifiers: true,
  applyMoodDecorations: true,
  applyMoodAccentColors: true,
  usePremiumModel: false,
};

export function normalizeCommercialGenerationInput(
  input: unknown,
): NormalizedCommercialGenerationInput {
  if (isCommercialLike(input)) {
    const parsed = CommercialInput.parse(input);
    const uploadIds = parsed.productRefs
      .map((ref) => ref.uploadId)
      .filter((id): id is string => typeof id === "string");
    const brief = buildCommercialBrief(parsed);
    const normalized: NormalizedCommercialGenerationInput = {
      mode: parsed.mode,
      creationType: parsed.creationType,
      brandId: parsed.brandId ?? null,
      projectId: parsed.projectId ?? null,
      moodId: parsed.moodId ?? null,
      brief,
      outputTarget: parsed.outputTarget ?? OUTPUT_FORMAT_TARGETS[parsed.outputs.formats[0]!],
      productRefs: parsed.productRefs,
      brandLogoAssetIds: parsed.brandLogoAssetIds,
      campaign: parsed.campaign,
      template: parsed.template,
      composition: parsed.composition,
      outputs: parsed.outputs,
      inspirationUploadIds: uploadIds,
      flags: mergeFlags(parsed.flags),
    };
    if (parsed.inspirationInfluence) {
      normalized.inspirationInfluence = parsed.inspirationInfluence;
    }
    return normalized;
  }

  const parsed = LegacyInput.parse(input);
  const uploadIds = parsed.inspirationUploadIds?.length
    ? parsed.inspirationUploadIds
    : parsed.inspirationUploadId
      ? [parsed.inspirationUploadId]
      : [];
  const variants = (parsed.numVariants ?? 4) as 1 | 2 | 3 | 4;
  const normalized: NormalizedCommercialGenerationInput = {
    mode: "legacy" as const,
    creationType: "single_product" as const,
    brandId: parsed.brandId,
    projectId: null,
    moodId: parsed.moodId ?? null,
    brief: parsed.brief,
    outputTarget: parsed.outputTarget,
    productRefs: uploadIds.map((uploadId) => ({ uploadId, role: "hero" as const })),
    brandLogoAssetIds: [],
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
    outputs: {
      variants,
      quality: parsed.flags.usePremiumModel ? "premium" : "standard",
      consistency: "off",
      formats: ["product_card"],
    },
    inspirationUploadIds: uploadIds,
    flags: mergeFlags(parsed.flags),
  };
  if (parsed.inspirationInfluence) {
    normalized.inspirationInfluence = parsed.inspirationInfluence;
  }
  return normalized;
}

export function commercialSettingsSnapshot(
  normalized: NormalizedCommercialGenerationInput,
  resolvedTarget: ResolvedOutputTarget,
) {
  return {
    mode: normalized.mode,
    creation_type: normalized.creationType,
    project_id: normalized.projectId,
    product_refs: normalized.productRefs,
    brand_logo_asset_ids: normalized.brandLogoAssetIds,
    campaign: normalized.campaign,
    template: normalized.template,
    composition: normalized.composition,
    outputs: normalized.outputs,
    primary_output_target: resolvedTarget,
  };
}

function isCommercialLike(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === "object" && "creationType" in input && "outputs" in input;
}

function buildCommercialBrief(parsed: z.infer<typeof CommercialInput>) {
  const productNames = parsed.productRefs
    .map((ref) => ref.commercialFields?.title ?? ref.commercialFields?.name)
    .filter(Boolean)
    .join(", ");
  const pieces = [
    parsed.brief,
    parsed.campaign.title,
    parsed.campaign.message,
    parsed.campaign.discount,
    parsed.campaign.cta,
    productNames ? `Products: ${productNames}` : undefined,
    `Template: ${parsed.template.family} / ${parsed.template.layout}`,
    `Composition: ${parsed.composition.backgroundStyle}, ${parsed.composition.realism}`,
  ].filter((piece): piece is string => !!piece && piece.trim().length > 0);
  return pieces.join("\n").slice(0, 500) || "Create a polished commercial product image.";
}

type ParsedFlags = {
  [K in keyof typeof defaultFlags]?: boolean | undefined;
} & {
  tier?: "standard" | "premium" | undefined;
  strength?: string | undefined;
  selectedModelCodes?: string[] | undefined;
};

function mergeFlags(flags: ParsedFlags | undefined): NormalizedCommercialGenerationInput["flags"] {
  const merged: NormalizedCommercialGenerationInput["flags"] = {
    useBrandColors: flags?.useBrandColors ?? defaultFlags.useBrandColors,
    useBrandLogo: flags?.useBrandLogo ?? defaultFlags.useBrandLogo,
    useBrandFonts: flags?.useBrandFonts ?? defaultFlags.useBrandFonts,
    brandStrict: flags?.brandStrict ?? defaultFlags.brandStrict,
    applyMoodModifiers: flags?.applyMoodModifiers ?? defaultFlags.applyMoodModifiers,
    applyMoodDecorations: flags?.applyMoodDecorations ?? defaultFlags.applyMoodDecorations,
    applyMoodAccentColors: flags?.applyMoodAccentColors ?? defaultFlags.applyMoodAccentColors,
    usePremiumModel: flags?.usePremiumModel ?? defaultFlags.usePremiumModel,
  };
  if (flags?.tier !== undefined) merged.tier = flags.tier;
  if (flags?.strength !== undefined) merged.strength = flags.strength;
  if (flags?.selectedModelCodes !== undefined) merged.selectedModelCodes = flags.selectedModelCodes;
  return merged;
}
