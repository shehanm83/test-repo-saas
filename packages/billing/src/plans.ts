export type PlanCode = "free" | "subscription" | "payg";
export type LegacyPlanCode = "starter" | "pro" | "business" | "agency";
export type AnyPlanCode = PlanCode | LegacyPlanCode | string;

export type BillingSegment = "free" | "subscription" | "payg";

export interface Plan {
  code: PlanCode;
  name: string;
  price: number;
  brandQuota: number;
  seatQuota: number;
  monthlyCreditGrant: number;
  monthlyCreditsExpire: boolean;
  purchasedCreditsExpire: boolean;
  fullStockLibrary: boolean;
  moods: boolean;
  premiumModels: boolean;
  savedProjects: boolean;
  historyDays: number;
  retentionDaysPerCredit: 5 | 10 | null;
}

export const PLANS: Record<PlanCode, Plan> = {
  free: {
    code: "free",
    name: "Free",
    price: 0,
    brandQuota: 1,
    seatQuota: 1,
    monthlyCreditGrant: 0,
    monthlyCreditsExpire: false,
    purchasedCreditsExpire: false,
    fullStockLibrary: false,
    moods: false,
    premiumModels: false,
    savedProjects: false,
    historyDays: 7,
    retentionDaysPerCredit: null,
  },
  subscription: {
    code: "subscription",
    name: "Subscription",
    price: 49,
    brandQuota: 3,
    seatQuota: 3,
    monthlyCreditGrant: 1000,
    monthlyCreditsExpire: true,
    purchasedCreditsExpire: false,
    fullStockLibrary: true,
    moods: true,
    premiumModels: true,
    savedProjects: true,
    historyDays: 365,
    retentionDaysPerCredit: null,
  },
  payg: {
    code: "payg",
    name: "Pay As You Go",
    price: 0,
    brandQuota: 1,
    seatQuota: 1,
    monthlyCreditGrant: 0,
    monthlyCreditsExpire: false,
    purchasedCreditsExpire: false,
    fullStockLibrary: true,
    moods: true,
    premiumModels: true,
    savedProjects: true,
    historyDays: 7,
    retentionDaysPerCredit: 10,
  },
};

export const FREE_INITIAL_CREDITS = 20;
export const PAYG_ACTION_MARKUP = 1.2;
export const PAYG_RETENTION_DAYS_PER_CREDIT = 10 as const;

export const LEGACY_PLAN_ALIASES: Record<LegacyPlanCode, PlanCode> = {
  starter: "subscription",
  pro: "subscription",
  business: "subscription",
  agency: "subscription",
};

export function normalizePlanCode(planCode: AnyPlanCode | null | undefined): PlanCode {
  if (planCode === "subscription" || planCode === "payg" || planCode === "free") {
    return planCode;
  }
  if (planCode === "starter" || planCode === "pro" || planCode === "business" || planCode === "agency") {
    return LEGACY_PLAN_ALIASES[planCode];
  }
  return "free";
}

export function planFor(planCode: AnyPlanCode | null | undefined): Plan {
  return PLANS[normalizePlanCode(planCode)];
}

export function billingSegmentFor(planCode: AnyPlanCode | null | undefined): BillingSegment {
  return normalizePlanCode(planCode);
}

export function isPaidPlan(planCode: AnyPlanCode | null | undefined) {
  return normalizePlanCode(planCode) !== "free";
}

export function priceCreditsForPlan(baseCredits: number, planCode: AnyPlanCode | null | undefined) {
  if (normalizePlanCode(planCode) !== "payg") {
    return baseCredits;
  }
  return Math.max(1, Math.ceil(baseCredits * PAYG_ACTION_MARKUP));
}

export function captionCreditsForPlan(
  lengthTier: "short" | "medium" | "long",
  planCode: AnyPlanCode | null | undefined,
) {
  const base = lengthTier === "short" ? 1 : lengthTier === "medium" ? 3 : 5;
  return priceCreditsForPlan(base, planCode);
}

export function planFromStripePriceId(
  env: Record<string, string | undefined>,
  priceId: string,
): PlanCode | null {
  const map: Record<string, PlanCode> = {};
  if (env.STRIPE_PRICE_FREE) map[env.STRIPE_PRICE_FREE] = "free";
  if (env.STRIPE_PRICE_SUBSCRIPTION) map[env.STRIPE_PRICE_SUBSCRIPTION] = "subscription";
  if (env.STRIPE_PRICE_STARTER) map[env.STRIPE_PRICE_STARTER] = "subscription";
  if (env.STRIPE_PRICE_PRO) map[env.STRIPE_PRICE_PRO] = "subscription";
  if (env.STRIPE_PRICE_BUSINESS) map[env.STRIPE_PRICE_BUSINESS] = "subscription";
  if (env.STRIPE_PRICE_AGENCY) map[env.STRIPE_PRICE_AGENCY] = "subscription";
  return map[priceId] ?? null;
}

export type TopupPackCode = "p200" | "p750" | "p2500";

export const TOPUP_PACKS: Record<TopupPackCode, { code: TopupPackCode; credits: number; priceUsd: number }> = {
  p200:  { code: "p200",  credits: 200,  priceUsd: 9 },
  p750:  { code: "p750",  credits: 750,  priceUsd: 29 },
  p2500: { code: "p2500", credits: 2500, priceUsd: 79 },
};
