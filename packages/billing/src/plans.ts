export type PlanCode = "free" | "starter" | "pro" | "business" | "agency";

export interface Plan {
  code: PlanCode;
  price: number;
  brandQuota: number;
  seatQuota: number;
  monthlyCreditGrant: number;
}

export const PLANS: Record<PlanCode, Plan> = {
  free:     { code: "free",     price: 0,   brandQuota: 1,   seatQuota: 1,   monthlyCreditGrant: 30 },
  starter:  { code: "starter",  price: 19,  brandQuota: 1,   seatQuota: 1,   monthlyCreditGrant: 250 },
  pro:      { code: "pro",      price: 49,  brandQuota: 3,   seatQuota: 3,   monthlyCreditGrant: 1000 },
  business: { code: "business", price: 129, brandQuota: 10,  seatQuota: 10,  monthlyCreditGrant: 4000 },
  agency:   { code: "agency",   price: 299, brandQuota: 50,  seatQuota: 999, monthlyCreditGrant: 15000 },
};

export function planFromStripePriceId(
  env: Record<string, string | undefined>,
  priceId: string,
): PlanCode | null {
  const map: Record<string, PlanCode> = {};
  if (env.STRIPE_PRICE_FREE) map[env.STRIPE_PRICE_FREE] = "free";
  if (env.STRIPE_PRICE_STARTER) map[env.STRIPE_PRICE_STARTER] = "starter";
  if (env.STRIPE_PRICE_PRO) map[env.STRIPE_PRICE_PRO] = "pro";
  if (env.STRIPE_PRICE_BUSINESS) map[env.STRIPE_PRICE_BUSINESS] = "business";
  if (env.STRIPE_PRICE_AGENCY) map[env.STRIPE_PRICE_AGENCY] = "agency";
  return map[priceId] ?? null;
}

export type TopupPackCode = "p200" | "p750" | "p2500";

export const TOPUP_PACKS: Record<TopupPackCode, { code: TopupPackCode; credits: number; priceUsd: number }> = {
  p200:  { code: "p200",  credits: 200,  priceUsd: 9 },
  p750:  { code: "p750",  credits: 750,  priceUsd: 29 },
  p2500: { code: "p2500", credits: 2500, priceUsd: 79 },
};
