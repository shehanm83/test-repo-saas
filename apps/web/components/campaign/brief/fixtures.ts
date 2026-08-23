"use client";

/**
 * Slice 60·A fixture. Shaped exactly like the payloads the Brief screen will get
 * from the server in 60·D, so wiring is a matter of deleting this file and
 * passing the real props through. Nothing here talks to an API or a database.
 */

import type { BrandLite, ProductLite } from "@/components/generate/commercial/types";

import { recipeMeta, type CampaignBriefForm, type CampaignRecipe } from "../types";

export const FIXTURE_BRANDS: BrandLite[] = [
  {
    id: "brand-northwind",
    name: "Northwind Coffee Roasters",
    palette: ["#2f6b4f", "#c98341", "#efe2cd", "#241a12"],
    logoAssets: [],
  },
  {
    id: "brand-harbour",
    name: "Harbour & Vine",
    palette: ["#1f3a5f", "#d8a24a", "#f4efe6"],
    logoAssets: [],
  },
];

export const FIXTURE_PRODUCTS: ProductLite[] = [
  {
    id: "prod-cold-brew",
    brandId: "brand-northwind",
    name: "Cold Brew Concentrate 1L",
    title: "Cold Brew Concentrate",
    subtitle: "18-hour slow steep",
    description: "Low-acid cold brew concentrate. Keeps two weeks in the fridge.",
    brandLabel: "Northwind",
    model: null,
    sku: "NW-CB-1L",
    category: "Coffee",
    priceMinor: 1800,
    compareAtPriceMinor: 2250,
    currency: "USD",
    discountText: "20% off",
    keyFeatures: ["18-hour steep", "Low acid", "Makes 8 cups"],
    benefits: ["No bitterness", "Ready in seconds"],
    targetAudience: "Home coffee drinkers",
  },
  {
    id: "prod-ethiopia",
    brandId: "brand-northwind",
    name: "Ethiopia Single-Origin 250g",
    title: "Ethiopia Guji",
    subtitle: "Washed, coarse ground",
    description: "Single-origin Guji, washed process, stone-fruit and jasmine.",
    brandLabel: "Northwind",
    model: null,
    sku: "NW-ETH-250",
    category: "Coffee",
    priceMinor: 2100,
    compareAtPriceMinor: null,
    currency: "USD",
    discountText: null,
    keyFeatures: ["Single origin", "Washed process"],
    benefits: ["Bright and floral"],
    targetAudience: "Filter coffee drinkers",
  },
  {
    id: "prod-brew-bottle",
    brandId: "brand-northwind",
    name: "Brew Bottle 500ml",
    title: "Brew Bottle",
    subtitle: "Borosilicate, 500ml",
    description: "Double-walled bottle sized for one concentrate pour.",
    brandLabel: "Northwind",
    model: null,
    sku: "NW-BB-500",
    category: "Glassware",
    priceMinor: 2400,
    compareAtPriceMinor: null,
    currency: "USD",
    discountText: null,
    keyFeatures: ["Borosilicate glass", "Dishwasher safe"],
    benefits: ["Keeps cold for hours"],
    targetAudience: "Home coffee drinkers",
  },
  {
    id: "prod-filter-papers",
    brandId: "brand-northwind",
    name: "Filter Papers ×100",
    title: "Filter Papers",
    subtitle: "Unbleached, 100 count",
    description: null,
    brandLabel: "Northwind",
    model: null,
    sku: "NW-FP-100",
    category: "Accessories",
    priceMinor: 700,
    compareAtPriceMinor: null,
    currency: "USD",
    discountText: null,
    keyFeatures: null,
    benefits: null,
    targetAudience: null,
  },
];

/** The Cold Brew Season campaign from the design mockup, for `/campaigns/:id`. */
export const FIXTURE_BRIEF: CampaignBriefForm = {
  name: "Cold Brew Season",
  recipe: "product_launch",
  brandId: "brand-northwind",
  productRefs: [
    {
      localId: "saved-prod-cold-brew",
      source: "saved",
      role: "hero",
      productId: "prod-cold-brew",
      commercialFields: { name: "Cold Brew Concentrate 1L", title: "Cold Brew Concentrate" },
    },
    {
      localId: "saved-prod-ethiopia",
      source: "saved",
      role: "bundle_item",
      productId: "prod-ethiopia",
      commercialFields: { name: "Ethiopia Single-Origin 250g", title: "Ethiopia Guji" },
    },
    {
      localId: "saved-prod-brew-bottle",
      source: "saved",
      role: "bundle_item",
      productId: "prod-brew-bottle",
      commercialFields: { name: "Brew Bottle 500ml", title: "Brew Bottle" },
    },
  ],
  platforms: ["instagram", "facebook", "tiktok"],
  startsOn: "2026-09-01",
  endsOn: "2026-09-21",
  brief:
    "Launching our 18-hour cold brew concentrate for the last warm stretch of the year. " +
    "Slow-steeped, low-acid, keeps two weeks in the fridge. Launch week runs 20% off with " +
    "the Brew Bottle bundle. Tone: unhurried, honest, a little bit nerdy about the process.",
  goal: "",
  audience: "",
  offer: { discount: "20% off", code: "SLOWDRIP", expiresAt: "2026-09-21T23:59" },
};

export interface BriefEstimate {
  slots: number;
  phases: number;
  videoSlots: number;
  credits: number;
}

const IMAGE_SLOT_CREDITS = 24;
const VIDEO_SLOT_CREDITS = 55;

/** Slots a recipe plans per platform per week, and the share of those that are video. */
const RECIPE_CADENCE: Record<CampaignRecipe, { perPlatformPerWeek: number; videoShare: number }> = {
  product_launch: { perPlatformPerWeek: 2, videoShare: 0.28 },
  offer: { perPlatformPerWeek: 2, videoShare: 0.2 },
  seasonal: { perPlatformPerWeek: 1.5, videoShare: 0.25 },
  always_on: { perPlatformPerWeek: 1.5, videoShare: 0.2 },
  catalogue: { perPlatformPerWeek: 1, videoShare: 0 },
  comparison: { perPlatformPerWeek: 1, videoShare: 0.34 },
  ad_test_pack: { perPlatformPerWeek: 3, videoShare: 0.25 },
};

/**
 * Stand-in for the campaign estimate the Plan engine returns in 61·C. It is a
 * shape, not a promise — the real number comes from per-slot `GenerationApi.estimate`.
 */
export function estimateBrief(form: CampaignBriefForm, days: number | null): BriefEstimate {
  const meta = recipeMeta(form.recipe);
  const phases = meta.phases.split("·").length;
  const cadence = RECIPE_CADENCE[form.recipe];
  const weeks = Math.max(1, (days ?? 7) / 7);
  const platforms = Math.max(1, form.platforms.length);

  const slots = Math.max(phases, Math.round(cadence.perPlatformPerWeek * weeks * platforms));
  const videoSlots = Math.round(slots * cadence.videoShare);
  const credits = (slots - videoSlots) * IMAGE_SLOT_CREDITS + videoSlots * VIDEO_SLOT_CREDITS;

  return { slots, phases, videoSlots, credits: Math.round(credits / 10) * 10 };
}
