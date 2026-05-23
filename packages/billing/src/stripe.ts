import type { BillingProvider } from "@layertone/shared";
import Stripe from "stripe";

export class StripeBillingProvider implements BillingProvider {
  private stripe: Stripe;

  constructor(
    private readonly opts: {
      secretKey: string;
      webhookSecret: string;
      topupPrices?: Record<string, string | undefined>;
    },
  ) {
    this.stripe = new Stripe(opts.secretKey, { apiVersion: "2025-04-30" as never });
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
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const s = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: args.customerId,
      line_items: [{ price: args.priceId, quantity: 1 }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      automatic_tax: { enabled: true },
      metadata: { workspaceId: args.workspaceId, kind: "subscription" },
      subscription_data: {
        metadata: { workspaceId: args.workspaceId },
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
    if (!priceId) throw new Error(`unknown-pack-${args.packCode}`);

    const { TOPUP_PACKS } = await import("./plans");
    const pack = TOPUP_PACKS[args.packCode as keyof typeof TOPUP_PACKS];
    if (!pack) throw new Error(`unknown-pack-${args.packCode}`);

    const s = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer: args.customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      automatic_tax: { enabled: true },
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
    const evt = this.stripe.webhooks.constructEvent(rawBody, signature, this.opts.webhookSecret);
    return { id: evt.id, type: evt.type, data: evt.data.object };
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
