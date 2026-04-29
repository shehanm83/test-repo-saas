import type { Adapters, Config } from "@vyora/shared";
import { z } from "zod";

export class BillingApi {
  constructor(
    private readonly config: Config,
    private readonly adapters: Adapters,
  ) {}

  async createCustomer(args: { workspaceId: string; input: unknown }) {
    const v = z.object({ email: z.string().email() }).parse(args.input);
    return this.adapters.billing.ensureCustomer(args.workspaceId, v.email);
  }

  async startSubscription(args: { workspaceId: string; customerId: string; input: unknown }) {
    const v = z
      .object({
        planCode: z.enum(["free", "starter", "pro", "business", "agency"]),
      })
      .parse(args.input);

    const priceId = this.config.billing.prices[v.planCode];
    if (!priceId) {
      throw new Error(`missing-stripe-price-for-plan-${v.planCode}`);
    }

    return this.adapters.billing.createSubscriptionCheckout({
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      priceId,
      successUrl: `${this.config.appUrl}/billing?subscription=success`,
      cancelUrl: `${this.config.appUrl}/billing?subscription=cancel`,
    });
  }

  async startTopup(args: { workspaceId: string; customerId: string; input: unknown }) {
    const v = z.object({ packCode: z.enum(["p200", "p750", "p2500"]) }).parse(args.input);

    return this.adapters.billing.createTopupCheckout({
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      packCode: v.packCode,
      successUrl: `${this.config.appUrl}/billing?topup=success`,
      cancelUrl: `${this.config.appUrl}/billing?topup=cancel`,
    });
  }

  async portal(args: { customerId: string }) {
    return this.adapters.billing.customerPortalUrl({
      customerId: args.customerId,
      returnUrl: `${this.config.appUrl}/billing`,
    });
  }
}
