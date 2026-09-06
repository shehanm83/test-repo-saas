import { createDb, subscriptions, workspaces } from "@layertone/db";
import type { Config } from "@layertone/shared";
import { eq } from "drizzle-orm";

import { Ledger } from "./ledger";
import { PLANS, TOPUP_PACKS, planFromStripePriceId } from "./plans";

type CheckoutSessionData = {
  id?: string;
  payment_status?: string;
  metadata?: {
    kind?: string;
    workspaceId?: string;
    packCode?: string;
  };
};

export class StripeWebhookHandler {
  constructor(private readonly config: Config) {}

  private async stripeProvider() {
    const { StripeBillingProvider } = await import("./stripe");
    return new StripeBillingProvider({
      secretKey: this.config.billing.stripeSecretKey!,
      topupPrices: this.config.billing.topupPrices,
      ...(this.config.billing.webhookSecret
        ? { webhookSecret: this.config.billing.webhookSecret }
        : {}),
    });
  }

  async handle(rawBody: string, signature: string): Promise<{ status: number; body: unknown }> {
    if (this.config.billing.mode === "stub") {
      return { status: 200, body: { skipped: "stub" } };
    }

    const provider = await this.stripeProvider();
    const evt = await provider.verifyWebhook(rawBody, signature);

    const dbAdmin = createDb(this.config.db.url, "app_admin");
    const ledger = new Ledger(dbAdmin);

    switch (evt.type) {
      case "invoice.paid": {
        const inv = evt.data as {
          subscription_details?: { metadata?: { workspaceId?: string; planCode?: string } };
          metadata?: { workspaceId?: string; planCode?: string };
          lines: { data: { price?: { id?: string } }[] };
        };
        const workspaceId =
          inv.subscription_details?.metadata?.workspaceId ?? inv.metadata?.workspaceId;
        if (!workspaceId) return { status: 200, body: { ignored: "no workspaceId" } };

        const priceId = inv.lines.data[0]?.price?.id;
        const metadataPlanCode =
          inv.subscription_details?.metadata?.planCode === "subscription" ||
          inv.metadata?.planCode === "subscription"
            ? "subscription"
            : null;
        const planCode =
          metadataPlanCode ??
          (priceId
            ? planFromStripePriceId(
              {
                STRIPE_PRICE_FREE: this.config.billing.prices.free,
                STRIPE_PRICE_SUBSCRIPTION: this.config.billing.prices.subscription,
                STRIPE_PRICE_STARTER: this.config.billing.prices.starter,
                STRIPE_PRICE_PRO: this.config.billing.prices.pro,
                STRIPE_PRICE_BUSINESS: this.config.billing.prices.business,
                STRIPE_PRICE_AGENCY: this.config.billing.prices.agency,
              },
              priceId,
            )
            : null);
        if (!planCode) return { status: 200, body: { ignored: "unknown plan" } };

        const plan = PLANS[planCode];
        if (plan.monthlyCreditsExpire) {
          await ledger.expireSubscriptionCredits({
            workspaceId,
            idempotencyKey: `stripe-expire-subscription-credits-${evt.id}`,
            metadata: { planCode },
          });
        }
        await dbAdmin
          .update(workspaces)
          .set({
            planCode,
            brandQuota: plan.brandQuota,
            seatQuota: plan.seatQuota,
            monthlyCreditGrant: plan.monthlyCreditGrant,
            status: "active",
          })
          .where(eq(workspaces.id, workspaceId));

        await ledger.grant({
          workspaceId,
          amount: plan.monthlyCreditGrant,
          idempotencyKey: `stripe-grant-${evt.id}`,
          stripeEventId: evt.id,
          metadata: {
            reason: "monthly-grant",
            creditBucket: "subscription",
            planCode,
          },
        });

        const subscriptionId =
          "subscription" in inv && typeof inv.subscription === "string"
            ? inv.subscription
            : undefined;
        if (subscriptionId) {
          await dbAdmin
            .insert(subscriptions)
            .values({
              workspaceId,
              stripeSubscriptionId: subscriptionId,
              planCode,
              status: "active",
            })
            .onConflictDoUpdate({
              target: subscriptions.workspaceId,
              set: {
                stripeSubscriptionId: subscriptionId,
                planCode,
                status: "active",
                updatedAt: new Date(),
              },
            });
        }
        return { status: 200, body: { ok: true } };
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = evt.data as {
          id: string;
          metadata?: { workspaceId?: string; planCode?: string };
          status: string;
          items: { data: { price: { id: string } }[] };
          current_period_start: number;
          current_period_end: number;
        };
        const workspaceId = sub.metadata?.workspaceId;
        if (!workspaceId) return { status: 200, body: { ignored: "no workspaceId" } };

        const priceId = sub.items.data[0]?.price.id;
        const metadataPlanCode = sub.metadata?.planCode === "subscription" ? "subscription" : null;
        const planCode =
          metadataPlanCode ??
          (priceId
            ? planFromStripePriceId(
              {
                STRIPE_PRICE_FREE: this.config.billing.prices.free,
                STRIPE_PRICE_SUBSCRIPTION: this.config.billing.prices.subscription,
                STRIPE_PRICE_STARTER: this.config.billing.prices.starter,
                STRIPE_PRICE_PRO: this.config.billing.prices.pro,
                STRIPE_PRICE_BUSINESS: this.config.billing.prices.business,
                STRIPE_PRICE_AGENCY: this.config.billing.prices.agency,
              },
              priceId,
            )
            : null);

        if (sub.status === "unpaid" || evt.type === "customer.subscription.deleted") {
          await dbAdmin
            .update(workspaces)
            .set({ status: "read_only" })
            .where(eq(workspaces.id, workspaceId));
        } else if (planCode) {
          await dbAdmin
            .update(workspaces)
            .set({ status: "active" })
            .where(eq(workspaces.id, workspaceId));
        }

        await dbAdmin
          .insert(subscriptions)
          .values({
            workspaceId,
            stripeSubscriptionId: sub.id,
            planCode: planCode ?? "free",
            status: sub.status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          })
          .onConflictDoUpdate({
            target: subscriptions.workspaceId,
            set: {
              stripeSubscriptionId: sub.id,
              planCode: planCode ?? "free",
              status: sub.status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              updatedAt: new Date(),
            },
          });
        return { status: 200, body: { ok: true } };
      }

      case "checkout.session.completed": {
        return this.applyCheckoutSession(evt.data as CheckoutSessionData, {
          sourceId: evt.id,
          ledger,
          dbAdmin,
          stripeEventId: evt.id,
        });
      }

      case "charge.refunded": {
        const c = evt.data as {
          metadata?: { workspaceId?: string; credits?: string };
        };
        const workspaceId = c.metadata?.workspaceId;
        if (!workspaceId) return { status: 200, body: { ignored: "no workspaceId" } };

        const refundedCredits = parseInt(c.metadata?.credits ?? "0", 10);
        if (refundedCredits <= 0) {
          return { status: 200, body: { ignored: "no credits hint" } };
        }

        await ledger.refund({
          workspaceId,
          amount: refundedCredits,
          idempotencyKey: `stripe-refund-${evt.id}`,
          stripeEventId: evt.id,
        });
        return { status: 200, body: { ok: true } };
      }

      default:
        return { status: 200, body: { ignored: evt.type } };
    }
  }

  async syncCheckoutSession(
    sessionId: string,
    expectedWorkspaceId?: string,
  ): Promise<{ status: number; body: unknown }> {
    if (this.config.billing.mode === "stub") {
      return { status: 200, body: { skipped: "stub" } };
    }

    const provider = await this.stripeProvider();
    const session = (await provider.retrieveCheckoutSession(sessionId)) as CheckoutSessionData;
    if (expectedWorkspaceId && session.metadata?.workspaceId !== expectedWorkspaceId) {
      return { status: 403, body: { error: "checkout-session-workspace-mismatch" } };
    }
    const dbAdmin = createDb(this.config.db.url, "app_admin");
    const ledger = new Ledger(dbAdmin);

    return this.applyCheckoutSession(session, {
      sourceId: session.id ?? sessionId,
      ledger,
      dbAdmin,
    });
  }

  private async applyCheckoutSession(
    sess: CheckoutSessionData,
    args: {
      sourceId: string;
      ledger: Ledger;
      dbAdmin: ReturnType<typeof createDb>;
      stripeEventId?: string;
    },
  ): Promise<{ status: number; body: unknown }> {
    if (sess.metadata?.kind !== "topup") {
      return { status: 200, body: { ignored: "non-topup checkout" } };
    }
    if (sess.payment_status && sess.payment_status !== "paid" && sess.payment_status !== "no_payment_required") {
      return { status: 200, body: { ignored: "checkout-not-paid" } };
    }

    const workspaceId = sess.metadata.workspaceId;
    if (!workspaceId) return { status: 200, body: { ignored: "no workspaceId" } };

    const packCode = sess.metadata.packCode as keyof typeof TOPUP_PACKS | undefined;
    const pack = packCode ? TOPUP_PACKS[packCode] : undefined;
    if (!pack) return { status: 400, body: { error: "unknown pack" } };

    await args.ledger.topup({
      workspaceId,
      amount: pack.credits,
      idempotencyKey: `stripe-topup-session-${sess.id ?? args.sourceId}`,
      ...(args.stripeEventId ? { stripeEventId: args.stripeEventId } : {}),
    });
    await args.dbAdmin
      .update(workspaces)
      .set({
        planCode: "payg",
        brandQuota: PLANS.payg.brandQuota,
        seatQuota: PLANS.payg.seatQuota,
        monthlyCreditGrant: PLANS.payg.monthlyCreditGrant,
        status: "active",
      })
      .where(eq(workspaces.id, workspaceId));
    return { status: 200, body: { ok: true, credits: pack.credits } };
  }
}
