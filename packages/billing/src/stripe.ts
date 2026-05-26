import type { BillingProvider } from "@layertone/shared";
import Stripe from "stripe";

import { TOPUP_PACKS } from "./plans";

export class StripeBillingProvider implements BillingProvider {
  private stripe: Stripe;

  constructor(
    private readonly opts: {
      secretKey: string;
      webhookSecret?: string;
      topupPrices?: Record<string, string | undefined>;
    },
  ) {
    this.stripe = new Stripe(opts.secretKey, {
      appInfo: { name: "Layertone", version: "0.0.0" },
      maxNetworkRetries: 2,
    });
  }

  async ensureCustomer(workspaceId: string, email: string) {
    const existing = await this.stripe.customers.list({ email, limit: 1 });
    if (existing.data[0]) return { customerId: existing.data[0].id };
    const c = await this.stripe.customers.create({ email, metadata: { workspaceId } });
    return { customerId: c.id };
  }

  async createSubscriptionCheckout(args: {
    workspaceId: string;
    customerId: string;
    priceId?: string;
    planCode: string;
    planName: string;
    unitAmountCents: number;
    successUrl: string;
    cancelUrl: string;
  }) {
    const lineItem = args.priceId
      ? { price: args.priceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd" as const,
            unit_amount: args.unitAmountCents,
            recurring: { interval: "month" as const },
            product_data: {
              name: args.planName,
              metadata: {
                kind: "subscription",
                planCode: args.planCode,
              },
            },
          },
          quantity: 1,
        };

    const s = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: args.customerId,
      client_reference_id: args.workspaceId,
      line_items: [lineItem],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        workspaceId: args.workspaceId,
        kind: "subscription",
        planCode: args.planCode,
      },
      subscription_data: {
        metadata: { workspaceId: args.workspaceId, planCode: args.planCode },
      },
    });
    return { url: s.url! };
  }

  async createTopupCheckout(args: {
    workspaceId: string;
    customerId: string;
    packCode: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const priceId = this.opts.topupPrices?.[args.packCode];
    const pack = TOPUP_PACKS[args.packCode as keyof typeof TOPUP_PACKS];
    if (!pack) throw new Error(`unknown-pack-${args.packCode}`);

    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd" as const,
            unit_amount: pack.priceUsd * 100,
            product_data: {
              name: `${pack.credits.toLocaleString("en-US")} credits`,
              metadata: {
                kind: "topup",
                packCode: args.packCode,
                credits: String(pack.credits),
              },
            },
          },
          quantity: 1,
        };

    const s = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer: args.customerId,
      client_reference_id: args.workspaceId,
      line_items: [lineItem],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        workspaceId: args.workspaceId,
        kind: "topup",
        packCode: args.packCode,
        credits: String(pack.credits),
      },
      payment_intent_data: {
        metadata: {
          workspaceId: args.workspaceId,
          kind: "topup",
          packCode: args.packCode,
          credits: String(pack.credits),
        },
      },
    });
    return { url: s.url! };
  }

  async customerPortalUrl(args: { customerId: string; returnUrl: string }) {
    const p = await this.stripe.billingPortal.sessions.create({
      customer: args.customerId,
      return_url: args.returnUrl,
    });
    return { url: p.url };
  }

  async verifyWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{ id: string; type: string; data: unknown }> {
    if (!this.opts.webhookSecret) {
      throw new Error("missing-stripe-webhook-secret");
    }
    const evt = this.stripe.webhooks.constructEvent(rawBody, signature, this.opts.webhookSecret);
    return { id: evt.id, type: evt.type, data: evt.data.object };
  }

  async retrieveCheckoutSession(sessionId: string): Promise<unknown> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  async refundCharge(args: { chargeId: string; reason?: string }) {
    await this.stripe.refunds.create({
      charge: args.chargeId,
      reason: "requested_by_customer",
      metadata: { reason: args.reason ?? "support" },
    });
  }

  async listPaidInvoices(args: {
    customerId: string;
  }): Promise<
    Array<{
      invoiceId: string;
      priceId: string | null;
      amount: string | null;
      date: string | null;
      hostedInvoiceUrl: string | null;
    }>
  > {
    const invoices = await this.stripe.invoices.list({
      customer: args.customerId,
      status: "paid",
      limit: 100,
    });

    return invoices.data.map((invoice) => ({
      invoiceId: invoice.id,
      priceId:
        typeof invoice.lines.data[0]?.pricing?.price_details?.price === "string"
          ? invoice.lines.data[0].pricing.price_details.price
          : null,
      amount:
        invoice.amount_paid != null
          ? `$${(invoice.amount_paid / 100).toFixed(2)}`
          : null,
      date: invoice.created
        ? new Date(invoice.created * 1000).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    }));
  }
}
