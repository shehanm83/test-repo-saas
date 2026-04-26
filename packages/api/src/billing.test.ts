import { describe, expect, it, vi } from "vitest";

import { BillingApi } from "./billing";

const mockEnsureCustomer = vi.fn(async () => ({ customerId: "cus_123" }));
const mockCreateSubscriptionCheckout = vi.fn(async () => ({ url: "https://stripe.test/sub" }));
const mockCreateTopupCheckout = vi.fn(async () => ({ url: "https://stripe.test/topup" }));
const mockCustomerPortalUrl = vi.fn(async () => ({ url: "https://stripe.test/portal" }));

const config = {
  appUrl: "http://localhost:3000",
  billing: {
    prices: {
      free: "price_free",
      starter: "price_starter",
      pro: "price_pro",
      business: "price_business",
      agency: "price_agency",
    },
  },
} as never;

const adapters = {
  billing: {
    ensureCustomer: mockEnsureCustomer,
    createSubscriptionCheckout: mockCreateSubscriptionCheckout,
    createTopupCheckout: mockCreateTopupCheckout,
    customerPortalUrl: mockCustomerPortalUrl,
  },
} as never;

describe("BillingApi", () => {
  it("creates a customer", async () => {
    const api = new BillingApi(config, adapters);
    const result = await api.createCustomer({
      workspaceId: "ws_1",
      input: { email: "owner@example.com" },
    });

    expect(result).toEqual({ customerId: "cus_123" });
    expect(mockEnsureCustomer).toHaveBeenCalledWith("ws_1", "owner@example.com");
  });

  it("starts a subscription checkout for a known plan", async () => {
    const api = new BillingApi(config, adapters);
    const result = await api.startSubscription({
      workspaceId: "ws_1",
      customerId: "cus_123",
      input: { planCode: "pro" },
    });

    expect(result.url).toContain("stripe.test/sub");
    expect(mockCreateSubscriptionCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        customerId: "cus_123",
        priceId: "price_pro",
      }),
    );
  });

  it("starts a topup checkout", async () => {
    const api = new BillingApi(config, adapters);
    const result = await api.startTopup({
      workspaceId: "ws_1",
      customerId: "cus_123",
      input: { packCode: "p750" },
    });

    expect(result.url).toContain("stripe.test/topup");
    expect(mockCreateTopupCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ packCode: "p750" }),
    );
  });

  it("creates a portal session", async () => {
    const api = new BillingApi(config, adapters);
    const result = await api.portal({ customerId: "cus_123" });

    expect(result.url).toContain("stripe.test/portal");
    expect(mockCustomerPortalUrl).toHaveBeenCalledWith({
      customerId: "cus_123",
      returnUrl: "http://localhost:3000/billing",
    });
  });
});
