# Slice 33 — Stripe top-up packs (PAYG)

**Phase:** 10 — Stripe billing
**Depends on:** 32
**Spec references:** [Spec § 6.3 (PAYG top-up flow)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- Three Stripe Products (one-time payments) for top-up packs: 200 credits ($9), 750 credits ($29), 2,500 credits ($79)
- `BillingProvider.createTopupCheckout(packCode)` generates Checkout Session
- `checkout.session.completed` webhook event handled: posts `topup` ledger entry tagged with `stripe_event_id`
- Top-up credits never expire (already true by ledger semantics — verified by integration test)
- Admin can configure pack pricing in env (`STRIPE_PRICE_TOPUP_200`, `_750`, `_2500`)

---

## Files

**Modify:**
- `packages/billing/src/stripe.ts` (implement `createTopupCheckout`)
- `packages/billing/src/stripe-webhook.ts` (handle `checkout.session.completed`)
- `packages/billing/src/plans.ts` (add `TOPUP_PACKS`)
- `packages/shared/src/config.ts` (add 3 env vars)

---

## Tasks

- [ ] **Step 1 — Add env vars to config schema**

In `packages/shared/src/config.ts`, add:
```ts
STRIPE_PRICE_TOPUP_200: z.string().optional(),
STRIPE_PRICE_TOPUP_750: z.string().optional(),
STRIPE_PRICE_TOPUP_2500: z.string().optional(),
```

And in `shape()` add:
```ts
billing: { ...prev, topupPrices: { p200: env.STRIPE_PRICE_TOPUP_200, p750: env.STRIPE_PRICE_TOPUP_750, p2500: env.STRIPE_PRICE_TOPUP_2500 } }
```

- [ ] **Step 2 — TOPUP_PACKS**

```ts
// packages/billing/src/plans.ts
export type TopupPackCode = "p200" | "p750" | "p2500";

export const TOPUP_PACKS: Record<TopupPackCode, { code: TopupPackCode; credits: number; priceUsd: number }> = {
  p200:  { code: "p200",  credits: 200,  priceUsd: 9 },
  p750:  { code: "p750",  credits: 750,  priceUsd: 29 },
  p2500: { code: "p2500", credits: 2500, priceUsd: 79 },
};
```

- [ ] **Step 3 — Implement `createTopupCheckout`**

```ts
// In StripeBillingProvider
async createTopupCheckout(args: { workspaceId: string; customerId: string; packCode: string; successUrl: string; cancelUrl: string }) {
  const priceMap = (this as never as { _topupPrices: Record<string, string | undefined> })._topupPrices;
  const priceId = priceMap[args.packCode];
  if (!priceId) throw new Error(`unknown-pack-${args.packCode}`);

  const s = await this.stripe.checkout.sessions.create({
    mode: "payment",
    customer: args.customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    automatic_tax: { enabled: true },
    metadata: { workspaceId: args.workspaceId, kind: "topup", packCode: args.packCode },
  });
  return { url: s.url! };
}
```

(Pass `topupPrices` into the constructor.)

- [ ] **Step 4 — Handle `checkout.session.completed`**

In `stripe-webhook.ts` switch:

```ts
case "checkout.session.completed": {
  const sess = evt.data as Stripe.Checkout.Session;
  if (sess.metadata?.kind !== "topup") return { status: 200, body: { ignored: "non-topup checkout" } };
  const workspaceId = sess.metadata.workspaceId!;
  const packCode = sess.metadata.packCode as keyof typeof TOPUP_PACKS;
  const pack = TOPUP_PACKS[packCode];
  if (!pack) return { status: 400, body: { error: "unknown pack" } };

  await ledger.topup({
    workspaceId, amount: pack.credits,
    idempotencyKey: `stripe-topup-${evt.id}`, stripeEventId: evt.id,
  });
  return { status: 200, body: { ok: true, credits: pack.credits } };
}
```

- [ ] **Step 5 — API endpoint helper (used by /billing UI in slice 43)**

In `packages/api/src/billing.ts` (new file):

```ts
import { z } from "zod";
import type { Adapters, Config } from "@studio/shared";
import { TOPUP_PACKS } from "@studio/billing";

export class BillingApi {
  constructor(private readonly config: Config, private readonly adapters: Adapters) {}

  async startTopup(args: { workspaceId: string; customerId: string; input: unknown }) {
    const v = z.object({ packCode: z.enum(["p200", "p750", "p2500"]) }).parse(args.input);
    return this.adapters.billing.createTopupCheckout({
      workspaceId: args.workspaceId, customerId: args.customerId, packCode: v.packCode,
      successUrl: `${this.config.appUrl}/billing?topup=success`,
      cancelUrl: `${this.config.appUrl}/billing?topup=cancel`,
    });
  }
}
```

- [ ] **Step 6 — Test + commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(billing): PAYG top-up packs with Stripe Checkout + webhook → ledger topup"
```

---

## Verification

```bash
pnpm --filter @studio/billing test
```

## Commit message

```
feat(billing): PAYG top-up packs with Stripe Checkout + webhook → ledger topup
```
