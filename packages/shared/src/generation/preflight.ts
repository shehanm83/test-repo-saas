import { normalizeCommercialGenerationInput } from "./commercial-contract";
import type { NormalizedCommercialGenerationInput } from "./commercial-contract";

export type PreflightSeverity = "low" | "medium" | "high";

export interface PreflightIssue {
  code: string;
  message: string;
  field?: string;
  severity?: PreflightSeverity;
}

export interface PreflightResult {
  blocking: PreflightIssue[];
  warnings: PreflightIssue[];
}

export function runCommercialPreflight(input: unknown, now: Date = new Date()): PreflightResult {
  const normalized = normalizeCommercialGenerationInput(input);
  return preflightNormalizedCommercialInput(normalized, now);
}

export function preflightNormalizedCommercialInput(
  input: NormalizedCommercialGenerationInput,
  now: Date = new Date(),
): PreflightResult {
  const blocking: PreflightIssue[] = [];
  const warnings: PreflightIssue[] = [];
  const isProductMode = [
    "single_product",
    "product_bundle",
    "campaign_set",
    "leaflet_catalogue",
    "comparison",
    "social_ad_pack",
  ].includes(input.creationType);

  if (input.mode !== "quick" && isProductMode && input.productRefs.length === 0) {
    blocking.push({
      code: "product.required",
      message: "Add at least one product or product image before generating.",
      field: "productRefs",
    });
  }

  if (input.outputs.formats.length === 0) {
    blocking.push({
      code: "output.required",
      message: "Choose at least one output format.",
      field: "outputs.formats",
    });
  }

  const family = input.template.family;
  const needsPrice = ["sale_poster", "leaflet_catalogue", "bundle_offer"].includes(family)
    || input.creationType === "leaflet_catalogue";
  if (needsPrice && !input.campaign.price && !input.campaign.discount) {
    warnings.push({
      code: "commercial.price_missing",
      message: "Sale and catalogue layouts work better with a price, discount, or offer badge.",
      field: "campaign.price",
      severity: "high",
    });
  }

  const needsCta = ["social_ad", "sale_poster", "event_promotion"].includes(family)
    || input.creationType === "social_ad_pack";
  if (needsCta && !input.campaign.cta) {
    warnings.push({
      code: "commercial.cta_missing",
      message: "Add a CTA so the ad has a clear commercial action.",
      field: "campaign.cta",
      severity: "medium",
    });
  }

  if (input.brandId && input.flags.useBrandLogo && input.flags.brandStrict && input.mode !== "legacy") {
    warnings.push({
      code: "brand.logo_required",
      message: "Strict brand mode is enabled. Confirm the selected brand has a usable logo.",
      field: "brandId",
      severity: "medium",
    });
  }

  if (input.campaign.qrUrl && !isValidUrl(input.campaign.qrUrl)) {
    blocking.push({
      code: "commercial.qr_url_invalid",
      message: "QR code URL must be a valid URL.",
      field: "campaign.qrUrl",
    });
  }

  if (input.campaign.offerExpiry && isPastDate(input.campaign.offerExpiry, now)) {
    warnings.push({
      code: "commercial.offer_expired",
      message: "The offer expiry date appears to be in the past.",
      field: "campaign.offerExpiry",
      severity: "high",
    });
  }

  const headline = input.campaign.title ?? input.brief;
  if (headline.length > 120) {
    warnings.push({
      code: "commercial.text_overflow_risk",
      message: "Headline or brief is long and may overflow template safe zones.",
      field: input.campaign.title ? "campaign.title" : "brief",
      severity: "medium",
    });
  }

  if (input.creationType === "leaflet_catalogue" && input.productRefs.length > 40) {
    blocking.push({
      code: "catalogue.too_many_products",
      message: "Catalogue mode supports up to 40 products in this flow.",
      field: "productRefs",
    });
  }

  if (input.creationType === "product_bundle" && input.productRefs.length > 8) {
    warnings.push({
      code: "bundle.too_many_products",
      message: "Bundles with more than 8 products may feel crowded.",
      field: "productRefs",
      severity: "medium",
    });
  }

  return { blocking, warnings };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isPastDate(value: string, now: Date) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  return parsed < now.getTime();
}
