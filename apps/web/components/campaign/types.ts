"use client";

import type { Platform } from "@layertone/shared/output-targets";

import type { SelectedProduct } from "@/components/generate/commercial/types";

export type CampaignStage = "brief" | "plan" | "look" | "board" | "deliver";

export type CampaignRecipe =
  | "product_launch"
  | "offer"
  | "seasonal"
  | "always_on"
  | "catalogue"
  | "comparison"
  | "ad_test_pack";

export interface RecipeMeta {
  id: CampaignRecipe;
  label: string;
  blurb: string;
  /** The phase shape the recipe produces — this is what the choice actually changes. */
  phases: string;
  /** Recipes whose slots carry price / discount / badge overlays. */
  usesOffer: boolean;
  /** Recipes that can be planned without a product attached. */
  productOptional: boolean;
}

export const CAMPAIGN_RECIPES: RecipeMeta[] = [
  {
    id: "product_launch",
    label: "Product launch",
    blurb: "New product going live",
    phases: "tease · launch · proof · last-call",
    usesOffer: true,
    productOptional: false,
  },
  {
    id: "offer",
    label: "Offer / sale",
    blurb: "Discount-driven push",
    phases: "announce · remind · last-call",
    usesOffer: true,
    productOptional: false,
  },
  {
    id: "seasonal",
    label: "Seasonal",
    blurb: "Holiday or season moment",
    phases: "build-up · peak · wind-down",
    usesOffer: false,
    productOptional: false,
  },
  {
    id: "always_on",
    label: "Always-on",
    blurb: "Keep posting consistently",
    phases: "hero · hub · hygiene",
    usesOffer: false,
    productOptional: true,
  },
  {
    id: "catalogue",
    label: "Catalogue",
    blurb: "Many SKUs, print + digital",
    phases: "single phase",
    usesOffer: false,
    productOptional: false,
  },
  {
    id: "comparison",
    label: "Comparison",
    blurb: "Before / after, or versus",
    phases: "single phase",
    usesOffer: false,
    productOptional: false,
  },
  {
    id: "ad_test_pack",
    label: "Ad test pack",
    blurb: "Angles × formats for paid",
    phases: "matrix",
    usesOffer: false,
    productOptional: false,
  },
];

export function recipeMeta(recipe: CampaignRecipe): RecipeMeta {
  return CAMPAIGN_RECIPES.find((entry) => entry.id === recipe) ?? CAMPAIGN_RECIPES[0]!;
}

export interface PlatformMeta {
  id: Platform;
  label: string;
}

export const CAMPAIGN_PLATFORMS: PlatformMeta[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "pinterest", label: "Pinterest" },
];

/**
 * Form state for the Brief screen. Every field is present so the controls stay
 * controlled; `toBriefInput` narrows it to the shape `POST /api/campaigns` takes.
 */
export interface CampaignBriefForm {
  name: string;
  recipe: CampaignRecipe;
  brandId: string;
  productRefs: SelectedProduct[];
  platforms: Platform[];
  /** ISO date, yyyy-mm-dd. */
  startsOn: string;
  endsOn: string;
  brief: string;
  goal: string;
  audience: string;
  offer: {
    discount: string;
    code: string;
    /** ISO datetime-local value. */
    expiresAt: string;
  };
}

/** The request body for `POST /api/campaigns` (slice 60·C). */
export interface CampaignBriefInput {
  name: string;
  recipe: CampaignRecipe;
  brandId: string;
  productRefs: Array<{
    productId?: string;
    uploadId?: string;
    role: SelectedProduct["role"];
    commercialFields?: SelectedProduct["commercialFields"];
  }>;
  platforms: Platform[];
  startsOn: string;
  endsOn: string;
  brief: string;
  goal?: string;
  audience?: string;
  offer?: { discount?: string; code?: string; expiresAt?: string };
}

export function toBriefInput(form: CampaignBriefForm): CampaignBriefInput {
  const meta = recipeMeta(form.recipe);
  const offerEntries = meta.usesOffer
    ? {
        ...(form.offer.discount.trim() ? { discount: form.offer.discount.trim() } : {}),
        ...(form.offer.code.trim() ? { code: form.offer.code.trim() } : {}),
        ...(form.offer.expiresAt ? { expiresAt: form.offer.expiresAt } : {}),
      }
    : {};

  return {
    name: form.name.trim(),
    recipe: form.recipe,
    brandId: form.brandId,
    productRefs: form.productRefs.map((product) => ({
      ...(product.productId ? { productId: product.productId } : {}),
      ...(product.uploadId ? { uploadId: product.uploadId } : {}),
      role: product.role,
      commercialFields: product.commercialFields,
    })),
    platforms: form.platforms,
    startsOn: form.startsOn,
    endsOn: form.endsOn,
    brief: form.brief.trim(),
    ...(form.goal.trim() ? { goal: form.goal.trim() } : {}),
    ...(form.audience.trim() ? { audience: form.audience.trim() } : {}),
    ...(Object.keys(offerEntries).length > 0 ? { offer: offerEntries } : {}),
  };
}

export interface BriefValidation {
  valid: boolean;
  /** Field key → message, for inline display. */
  errors: Partial<Record<"name" | "brandId" | "productRefs" | "platforms" | "dates" | "brief", string>>;
  /** Why the primary button is disabled, or null when it is not. */
  blockingReason: string | null;
}

export function validateBrief(form: CampaignBriefForm): BriefValidation {
  const meta = recipeMeta(form.recipe);
  const errors: BriefValidation["errors"] = {};

  if (!form.name.trim()) errors.name = "Give the campaign a name.";
  if (!form.brandId) errors.brandId = "Pick the brand this campaign runs under.";
  if (!meta.productOptional && form.productRefs.length === 0) {
    errors.productRefs = "Add at least one product.";
  }
  if (form.platforms.length === 0) errors.platforms = "Pick at least one platform.";
  if (!form.startsOn || !form.endsOn) {
    errors.dates = "Set a start and end date.";
  } else if (form.endsOn <= form.startsOn) {
    errors.dates = "The end date has to be after the start date.";
  }
  if (form.brief.trim().length < 20) {
    errors.brief = `Describe the campaign in a sentence or two (${form.brief.trim().length}/20 characters).`;
  }

  const first = Object.values(errors)[0] ?? null;
  return { valid: first === null, errors, blockingReason: first };
}

export function durationDays(startsOn: string, endsOn: string): number | null {
  if (!startsOn || !endsOn) return null;
  const start = Date.parse(`${startsOn}T00:00:00Z`);
  const end = Date.parse(`${endsOn}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}

export function durationLabel(startsOn: string, endsOn: string): string | null {
  const days = durationDays(startsOn, endsOn);
  if (days === null) return null;
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  const weeks = Math.round(days / 7);
  return `${weeks} weeks`;
}
