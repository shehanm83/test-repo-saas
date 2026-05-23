# Slice 32 — Stripe subscriptions

**Phase:** 10 — Stripe billing
**Depends on:** 19
**Spec references:** [Spec § 6.1, 6.2, 6.4 (Stripe integration, monthly grant, plan changes)](../specs/2026-04-25-layertone-v1-spec.md).

**Definition of done:**
- `StripeBillingProvider` wraps Stripe SDK; implements `BillingProvider` (slice 05 interface)
- API endpoints: create-customer, create-subscription-checkout, customer-portal-url
- Webhook handler for `invoice.paid`, `customer.subscription.created/updated/deleted`
- On `invoice.paid`: posts `grant` ledger entry (idempotent on event id), upserts `subscriptions` row, syncs `workspaces.plan_code` and quotas
- Plan upgrade/downgrade via Stripe Customer Portal
- Tests use Stripe test mode webhook fixtures

---

## Files

**Create:**
- `packages/billing/src/stripe.ts` (provider)
- `packages/billing/src/stripe-webhook.ts`
- `packages/billing/src/stripe.test.ts`
- `packages/billing/src/plans.ts` (plan code → quotas mapping)

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @layertone/billing add stripe
```

- [ ] **Step 2 — Plans**

```ts
// packages/billing/src/plans.ts
export type PlanCode = "free" | "starter" | "pro" | "business" | "agency";

export interface Plan {
  code: PlanCode; price: number; brandQuota: number; seatQuota: number; monthlyCreditGrant: number;
}

export const PLANS: Record<PlanCode, Plan> = {
  free:     { code: "free",     price: 0,   brandQuota: 1,   seatQuota: 1,   monthlyCreditGrant: 30 },
  starter:  { code: "starter",  price: 19,  brandQuota: 1,   seatQuota: 1,   monthlyCreditGrant: 250 },
  pro:      { code: "pro",      price: 49,  brandQuota: 3,   seatQuota: 3,   monthlyCreditGrant: 1000 },
  business: { code: "business", price: 129, brandQuota: 10,  seatQuota: 10,  monthlyCreditGrant: 4000 },
  agency:   { code: "agency",   price: 299, brandQuota: 50,  seatQuota: 999, monthlyCreditGrant: 15000 },
};

export function planFromStripePriceId(env: Record<string, string | undefined>, priceId: string): PlanCode | null {
  const map: Record<string, PlanCode> = {
    [env.STRIPE_PRICE_FREE ?? ""]: "free",
    [env.STRIPE_PRICE_STARTER ?? ""]: "starter",
    [env.STRIPE_PRICE_PRO ?? ""]: "pro",
    [env.STRIPE_PRICE_BUSINESS ?? ""]: "business",
    [env.STRIPE_PRICE_AGENCY ?? ""]: "agency",
  };
  return map[priceId] ?? null;
}
```

- [ ] **Step 3 — Stripe provider**

```ts
// packages/billing/src/stripe.ts
import Stripe from "stripe";
import type { BillingProvider } from "@layertone/shared";

export class StripeBillingProvider implements BillingProvider {
  private stripe: Stripe;
  constructor(private readonly opts: { secretKey: string; webhookSecret: string }) {
    this.stripe = new Stripe(opts.secretKey, { apiVersion: "2025-04-30" as never });
  }

  async ensureCustomer(workspaceId: string, email: string) {
    const existing = await this.stripe.customers.list({ email, limit: 1 });
    if (existing.data[0]) return { customerId: existing.data[0].id };
    const c = await this.stripe.customers.create({ email, metadata: { workspaceId } });
    return { customerId: c.id };
  }

  async createSubscriptionCheckout(args: { workspaceId: string; customerId: string; priceId: string; successUrl: string; cancelUrl: string }) {
    const s = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: args.customerId,
      line_items: [{ price: args.priceId, quantity: 1 }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      automatic_tax: { enabled: true },
      metadata: { workspaceId: args.workspaceId, kind: "subscription" },
    });
    return { url: s.url! };
  }

  async createTopupCheckout(args: { workspaceId: string; customerId: string; packCode: string; successUrl: string; cancelUrl: string }) {
    // Implemented in slice 33; throw here for now to fail loudly.
    throw new Error("createTopupCheckout implemented in slice 33");
  }

  async customerPortalUrl(args: { customerId: string; returnUrl: string }) {
    const p = await this.stripe.billingPortal.sessions.create({ customer: args.customerId, return_url: args.returnUrl });
    return { url: p.url };
  }

  async verifyWebhook(rawBody: string, signature: string) {
    const evt = this.stripe.webhooks.constructEvent(rawBody, signature, this.opts.webhookSecret);
    return { id: evt.id, type: evt.type, data: evt.data.object };
  }
}
```

- [ ] **Step 4 — Webhook handler**

```ts
// packages/billing/src/stripe-webhook.ts
import { eq } from "drizzle-orm";
import { createDb, subscriptions, workspaces } from "@layertone/db";
import { Ledger } from "./ledger.js";
import { PLANS, planFromStripePriceId } from "./plans.js";
import type { Config } from "@layertone/shared";
import type Stripe from "stripe";

export class StripeWebhookHandler {
  constructor(private readonly config: Config) {}

  async handle(rawBody: string, signature: string): Promise<{ status: number; body: unknown }> {
    if (this.config.billing.mode === "stub") return { status: 200, body: { skipped: "stub" } };

    const provider = new (await import("./stripe.js")).StripeBillingProvider({
      secretKey: this.config.billing.stripeSecretKey!,
      webhookSecret: this.config.billing.webhookSecret!,
    });
    const evt = await provider.verifyWebhook(rawBody, signature);

    const dbAdmin = createDb(this.config.db.url, "app_admin");
    const ledger = new Ledger(dbAdmin);

    switch (evt.type) {
      case "invoice.paid": {
        const inv = evt.data as Stripe.Invoice;
        const workspaceId = (inv.subscription_details?.metadata?.workspaceId ?? inv.metadata?.workspaceId) as string | undefined;
        if (!workspaceId) return { status: 200, body: { ignored: "no workspaceId" } };

        const priceId = inv.lines.data[0]?.price?.id;
        const planCode = priceId ? planFromStripePriceId(process.env, priceId) : null;
        if (!planCode) return { status: 200, body: { ignored: "unknown plan" } };

        const plan = PLANS[planCode];
        await dbAdmin.update(workspaces).set({
          planCode, brandQuota: String(plan.brandQuota), seatQuota: String(plan.seatQuota),
          monthlyCreditGrant: String(plan.monthlyCreditGrant), status: "active",
        }).where(eq(workspaces.id, workspaceId));

        await ledger.grant({
          workspaceId, amount: plan.monthlyCreditGrant,
          idempotencyKey: `stripe-grant-${evt.id}`, stripeEventId: evt.id,
          metadata: { reason: "monthly-grant", planCode },
        });
        return { status: 200, body: { ok: true } };
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = evt.data as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (!workspaceId) return { status: 200, body: { ignored: "no workspaceId" } };

        const priceId = sub.items.data[0]?.price.id;
        const planCode = priceId ? planFromStripePriceId(process.env, priceId) : null;

        if (sub.status === "unpaid" || evt.type === "customer.subscription.deleted") {
          await dbAdmin.update(workspaces).set({ status: "read_only" }).where(eq(workspaces.id, workspaceId));
        } else if (planCode) {
          await dbAdmin.update(workspaces).set({ status: "active" }).where(eq(workspaces.id, workspaceId));
        }

        await dbAdmin.insert(subscriptions).values({
          workspaceId,
          stripeSubscriptionId: sub.id,
          planCode: planCode ?? "free",
          status: sub.status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        }).onConflictDoUpdate({
          target: subscriptions.workspaceId,
          set: { stripeSubscriptionId: sub.id, planCode: planCode ?? "free", status: sub.status,
                 currentPeriodStart: new Date(sub.current_period_start * 1000),
                 currentPeriodEnd: new Date(sub.current_period_end * 1000),
                 updatedAt: new Date() },
        });
        return { status: 200, body: { ok: true } };
      }
      default:
        return { status: 200, body: { ignored: evt.type } };
    }
  }
}
```

- [ ] **Step 5 — Wire factory**

When `BILLING_MODE` ∈ {`stripe-live`, `stripe-test`}: `billing = new StripeBillingProvider(...)`. Otherwise stub.

- [ ] **Step 6 — Tests with Stripe webhook fixtures + commit**

Use Stripe's documented webhook signature shape for fixtures; mock the stripe SDK. Or skip in CI and run as integration with live test-mode keys behind a flag.

```bash
pnpm test:unit
git add -A
git commit -m "feat(billing): Stripe subscription provider + webhook handler with monthly grant ledger entry"
```

---

## Verification

```bash
pnpm --filter @layertone/billing test
```

## Commit message

```
feat(billing): Stripe subscription provider + webhook handler with monthly grant ledger entry
```
