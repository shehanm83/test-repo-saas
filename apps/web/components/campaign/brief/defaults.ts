import type { CampaignBriefForm } from "../types";

function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/** A server-safe blank campaign for `/campaigns/new`. */
export function emptyBrief(brandId: string): CampaignBriefForm {
  return {
    name: "",
    recipe: "product_launch",
    brandId,
    productRefs: [],
    platforms: ["instagram"],
    startsOn: isoDate(3),
    endsOn: isoDate(24),
    brief: "",
    goal: "",
    audience: "",
    offer: { discount: "", code: "", expiresAt: "" },
  };
}
