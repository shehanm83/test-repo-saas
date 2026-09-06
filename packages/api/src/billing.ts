import { createDb, workspaces } from "@layertone/db";
import { eq } from "@layertone/db/operators";
import type { Adapters, Config } from "@layertone/shared";
import { z } from "zod";
import { Ledger, PLANS, TOPUP_PACKS } from "@layertone/billing";

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
        planCode: z.enum(["free", "subscription"]),
      })
      .parse(args.input);

    if (v.planCode === "free") {
      const db = createDb(this.config.db.url, "app_admin");
      const plan = PLANS.free;
      await db
        .update(workspaces)
        .set({
          planCode: "free",
          brandQuota: plan.brandQuota,
          seatQuota: plan.seatQuota,
          monthlyCreditGrant: plan.monthlyCreditGrant,
        })
        .where(eq(workspaces.id, args.workspaceId));
      return { url: `${this.config.appUrl}/billing?subscription=success` };
    }

    const priceId = this.config.billing.prices[v.planCode];
    const plan = PLANS[v.planCode];

    return this.adapters.billing.createSubscriptionCheckout({
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      ...(priceId ? { priceId } : {}),
      planCode: v.planCode,
      planName: plan.name,
      unitAmountCents: plan.price * 100,
      successUrl: `${this.config.appUrl}/billing?subscription=success&checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${this.config.appUrl}/billing?subscription=cancel`,
    });
  }

  async startTopup(args: { workspaceId: string; customerId: string; input: unknown }) {
    const v = z.object({ packCode: z.enum(["p200", "p750", "p2500"]) }).parse(args.input);

    if (this.config.billing.mode === "stub") {
      const db = createDb(this.config.db.url, "app_admin");
      await db
        .update(workspaces)
        .set({
          planCode: "payg",
          brandQuota: PLANS.payg.brandQuota,
          seatQuota: PLANS.payg.seatQuota,
          monthlyCreditGrant: PLANS.payg.monthlyCreditGrant,
        })
        .where(eq(workspaces.id, args.workspaceId));
      await new Ledger(db).topup({
        workspaceId: args.workspaceId,
        amount: TOPUP_PACKS[v.packCode].credits,
        idempotencyKey: `stub-topup-${args.workspaceId}-${v.packCode}-${Date.now()}`,
      });
    }

    return this.adapters.billing.createTopupCheckout({
      workspaceId: args.workspaceId,
      customerId: args.customerId,
      packCode: v.packCode,
      successUrl: `${this.config.appUrl}/billing?topup=success&checkout_session_id={CHECKOUT_SESSION_ID}`,
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
