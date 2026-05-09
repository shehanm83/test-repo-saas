"use client";

export interface BrandLite {
  id: string;
  name: string;
  palette?: string[] | null;
  logoAssets?: Array<{
    id: string;
    url?: string | null;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
  }>;
}

export interface MoodLite {
  id: string;
  name: string;
  kind: string;
  group: "now" | "always" | "soon";
  img?: string | null;
  colors?: string[];
}

export interface ProductLite {
  id: string;
  brandId: string | null;
  name: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  brandLabel?: string | null;
  model?: string | null;
  sku?: string | null;
  category?: string | null;
  priceMinor?: number | null;
  compareAtPriceMinor?: number | null;
  currency?: string | null;
  discountText?: string | null;
  keyFeatures?: string[] | null;
  benefits?: string[] | null;
  targetAudience?: string | null;
}

export type GenerateMode = "quick" | "campaign_builder";
export type CreationType =
  | "single_product"
  | "product_bundle"
  | "campaign_set"
  | "leaflet_catalogue"
  | "comparison"
  | "social_ad_pack";
export type ProductRole = "hero" | "bundle_item" | "catalogue_item" | "before" | "after";
export type OutputFormat =
  | "instagram_square"
  | "instagram_portrait"
  | "instagram_landscape"
  | "instagram_story"
  | "instagram_reel"
  | "instagram_feed_video_portrait"
  | "instagram_feed_video_square"
  | "facebook_feed"
  | "facebook_square"
  | "facebook_portrait"
  | "facebook_landscape"
  | "facebook_link_preview"
  | "facebook_profile_photo"
  | "facebook_cover_photo"
  | "facebook_story"
  | "linkedin_feed"
  | "tiktok_vertical"
  | "website_banner"
  | "product_card"
  | "ad_creative"
  | "print_leaflet_a4";
export type Quality = "standard" | "premium";
export type ProductSize = "small" | "balanced" | "dominant";
export type ProductPosition = "center" | "left" | "right" | "bottom" | "template";
export type BackgroundStyle =
  | "studio"
  | "lifestyle"
  | "abstract"
  | "seasonal"
  | "marketplace_white"
  | "transparent";
export type Realism = "clean_render" | "realistic_photo" | "premium_editorial" | "commercial_3d";
export type ShadowReflection = "none" | "soft_shadow" | "hard_shadow" | "reflection";
export type LabelVisibility = "hide" | "preserve" | "emphasize";
export type PackagingVisibility = "product_only" | "packaging_only" | "both";
export type BrandBlend = "low" | "medium" | "high";
export type Consistency = "off" | "same_mood" | "strict_campaign";

export interface ProductSnapshot {
  name?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  brandLabel?: string;
  model?: string;
  sku?: string;
  category?: string;
  priceMinor?: number;
  compareAtPriceMinor?: number;
  currency?: string;
  discountText?: string;
  keyFeatures?: string[];
  benefits?: string[];
  targetAudience?: string;
}

export interface SelectedProduct {
  localId: string;
  source: "saved" | "draft" | "upload";
  role: ProductRole;
  productId?: string;
  uploadId?: string;
  previewUrl?: string;
  uploadPending?: boolean;
  commercialFields: ProductSnapshot;
}

export interface CampaignDetails {
  title: string;
  subtitle: string;
  message: string;
  price: string;
  discount: string;
  badgeText: string;
  cta: string;
  offerExpiry: string;
  legalText: string;
  website: string;
  phone: string;
  qrUrl: string;
  benefitsText: string;
  targetAudience: string;
}

export interface TemplateSelection {
  family: string;
  layout: string;
}

export interface CompositionControls {
  productSize: ProductSize;
  productPosition: ProductPosition;
  backgroundStyle: BackgroundStyle;
  realism: Realism;
  shadowReflection: ShadowReflection;
  labelVisibility: LabelVisibility;
  packagingVisibility: PackagingVisibility;
  keepOriginalShape: boolean;
  brandBlend: BrandBlend;
}

export interface OutputSettings {
  variants: 1 | 2 | 3 | 4;
  quality: Quality;
  consistency: Consistency;
  formats: OutputFormat[];
}

export interface BrandFlags {
  useBrandColors: boolean;
  useBrandLogo: boolean;
  useBrandFonts: boolean;
  brandStrict: boolean;
  applyMoodModifiers: boolean;
  applyMoodDecorations: boolean;
  applyMoodAccentColors: boolean;
  usePremiumModel: boolean;
}

export interface GenerateState {
  mode: GenerateMode;
  activeStep: number;
  creationType: CreationType;
  brandId: string;
  moodId: string | null;
  brief: string;
  selectedProducts: SelectedProduct[];
  campaign: CampaignDetails;
  template: TemplateSelection;
  composition: CompositionControls;
  outputs: OutputSettings;
  flags: BrandFlags;
  brandLogoAssetIds: string[];
}

export interface PreflightIssue {
  code: string;
  message: string;
  field?: string;
  severity?: "low" | "medium" | "high";
}

export interface CreditEstimate {
  credits: number;
  balance?: number;
  lineItems: Array<{ label: string; credits: number }>;
}

export interface PreflightResult {
  blocking: PreflightIssue[];
  warnings: PreflightIssue[];
  estimate?: CreditEstimate;
}

export interface PromptPreviewResult {
  mode: GenerateMode;
  templateId: string;
  templateVersion: number;
  templatePath: string;
  prompt: string;
  negativePrompt: string | null;
  overlaySlots: Record<string, unknown>;
  modelInstructions: {
    compatibleModels: string[];
    safetyRules: string[];
  };
  outputTarget: {
    kind: "social" | "image";
    platform: string | null;
    format: string | null;
    aspectRatio: string;
    width: number;
    height: number;
  };
  generationTemplate: {
    id: string;
    slug: string | null;
    name: string;
    preferredModel: string;
    hasTextSafeZones: boolean;
  } | null;
}

export type GeneratePayload = {
  mode: GenerateMode;
  creationType: CreationType;
  brandId?: string;
  moodId: string | null;
  brief?: string;
  productRefs: Array<{
    productId?: string;
    uploadId?: string;
    role: ProductRole;
    commercialFields?: ProductSnapshot;
  }>;
  campaign: Partial<{
    title: string;
    subtitle: string;
    message: string;
    price: string;
    discount: string;
    badgeText: string;
    cta: string;
    offerExpiry: string;
    legalText: string;
    website: string;
    phone: string;
    qrUrl: string;
    benefits: string[];
    targetAudience: string;
  }>;
  template: TemplateSelection;
  composition: CompositionControls;
  outputs: OutputSettings;
  flags: BrandFlags;
  brandLogoAssetIds: string[];
};
