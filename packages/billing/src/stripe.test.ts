import { describe, it, expect, vi, beforeEach } from "vitest";

import { PLANS } from "./plans.js";
import { StripeWebhookHandler } from "./stripe-webhook.js";

// Mock @vyora/db
vi.mock("@vyora/db", () => ({
  createDb: vi.fn(() => ({})),
  subscriptions: {},
  workspaces: {},
}));

// Mock drizzle-orm eq
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

const mockGrant = vi.fn(async () => ({ id: "e1", balanceAfter: 250, idempotent: false }));
const mockTopup = vi.fn(async () => ({ id: "e2", balanceAfter: 450, idempotent: false }));
const mockRefund = vi.fn(async () => ({ id: "e3", balanceAfter: 200, idempotent: false }));

vi.mock("./ledger.js", () => ({
  Ledger: vi.fn(function () {
    return { grant: mockGrant, topup: mockTopup, refund: mockRefund };
  }),
}));

const mockDbUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) }));
const mockDbInsert = vi.fn(() => ({
  values: vi.fn(() => ({ onConflictDoUpdate: vi.fn() })),
}));

vi.mock("@vyora/db", () => ({
  createDb: vi.fn(() => ({ update: mockDbUpdate, insert: mockDbInsert })),
  subscriptions: { workspaceId: "ws_col" },
  workspaces: {},
}));

const STUB_CONFIG = {
  billing: { mode: "stub" as const },
  db: { url: "postgres://x" },
} as never;

// Fake StripeBillingProvider that bypasses actual Stripe SDK
vi.mock("./stripe.js", () => ({
  StripeBillingProvider: vi.fn(function () {
    return {
      verifyWebhook: vi.fn(async (_body: string, _sig: string) => {
        return { id: "evt_1", type: "unknown", data: {} };
      }),
    };
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StripeWebhookHandler", () => {
  it("returns skipped for stub mode", async () => {
    const h = new StripeWebhookHandler(STUB_CONFIG);
    const r = await h.handle("body", "sig");
    expect(r.status).toBe(200);
    expect((r.body as { skipped: string }).skipped).toBe("stub");
  });
});

describe("PLANS", () => {
  it("defines correct monthly grant for pro plan", () => {
    expect(PLANS.pro.monthlyCreditGrant).toBe(1000);
  });

  it("defines correct brand quota for agency plan", () => {
    expect(PLANS.agency.brandQuota).toBe(50);
  });

  it("covers all plan codes", () => {
    const codes = ["free", "starter", "pro", "business", "agency"] as const;
    for (const code of codes) {
      expect(PLANS[code]).toBeDefined();
      expect(PLANS[code].monthlyCreditGrant).toBeGreaterThan(0);
    }
  });
});

describe("planFromStripePriceId", () => {
  it("maps known price id to plan code", async () => {
    const { planFromStripePriceId } = await import("./plans.js");
    const env = { STRIPE_PRICE_PRO: "price_pro_123" };
    expect(planFromStripePriceId(env, "price_pro_123")).toBe("pro");
  });

  it("returns null for unknown price id", async () => {
    const { planFromStripePriceId } = await import("./plans.js");
    expect(planFromStripePriceId({}, "price_unknown")).toBeNull();
  });
});
