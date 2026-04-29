# Slice 34 — Dunning + refunds + reconciliation

**Phase:** 10 — Stripe billing
**Depends on:** 32, 33
**Spec references:** [Spec § 6.5–6.7](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `customer.subscription.updated` with `status='unpaid'` flips workspace to `read_only` (already done in slice 32; verify here)
- `charge.refunded` webhook posts a paired `refund` ledger entry; idempotent on event id
- Daily reconciliation job (extending slice 20) cross-checks Stripe-side invoice/payment events against ledger entries with `stripe_event_id`; emits Sentry alert on drift
- Admin support tool `refundTopup({ topupChargeId })` issues Stripe refund + posts paired ledger entry

---

## Files

**Modify:**
- `packages/billing/src/stripe-webhook.ts`
- `packages/billing/src/reconcile.ts`
- `packages/billing/src/stripe.ts` (add `refundCharge`)

**Create:**
- `packages/billing/src/refund.ts`
- `packages/billing/src/reconcile.test.ts`

---

## Tasks

- [ ] **Step 1 — Refund webhook**

```ts
// packages/billing/src/stripe-webhook.ts — add case
case "charge.refunded": {
  const c = evt.data as Stripe.Charge;
  // Find original ledger entry by stripe charge → topup mapping
  const refundedAmount = (c.amount_refunded ?? 0) / 100;  // dollars
  // Recover the workspaceId from charge.metadata or from the ledger entry of the original payment
  const workspaceId = c.metadata?.workspaceId;
  if (!workspaceId) return { status: 200, body: { ignored: "no workspaceId" } };

  // Map dollar refund → credit refund. Lookup the topup pack by amount; or store a credits hint in metadata.
  const refundedCredits = parseInt(c.metadata?.credits ?? "0", 10);
  if (refundedCredits <= 0) return { status: 200, body: { ignored: "no credits hint" } };

  await ledger.refund({
    workspaceId, amount: refundedCredits,
    idempotencyKey: `stripe-refund-${evt.id}`, stripeEventId: evt.id,
  });
  return { status: 200, body: { ok: true } };
}
```

(Make sure topup checkout sessions stamp `metadata.credits` on the line item or charge so we can recover credits at refund time.)

- [ ] **Step 2 — Stripe provider `refundCharge`**

```ts
async refundCharge(args: { chargeId: string; reason?: string }) {
  await this.stripe.refunds.create({ charge: args.chargeId, reason: "requested_by_customer", metadata: { reason: args.reason ?? "support" } });
}
```

(Add to BillingProvider interface in `packages/shared/src/adapters/types.ts`.)

- [ ] **Step 3 — Refund admin endpoint**

```ts
// packages/billing/src/refund.ts
import type { BillingProvider } from "@vyora/shared";

export class RefundService {
  constructor(private readonly billing: BillingProvider) {}
  async refund(chargeId: string, reason?: string) {
    return (this.billing as unknown as { refundCharge: (a: { chargeId: string; reason?: string }) => Promise<void> }).refundCharge({ chargeId, reason });
  }
}
```

- [ ] **Step 4 — Reconciliation enhancement**

In `packages/billing/src/reconcile.ts`, extend `reconcileWorkspace` to:
1. Pull all `invoice.paid` events for the customer from Stripe API (`stripe.invoices.list({ customer, status: "paid" })`)
2. Sum the credit grants those should have produced
3. Sum ledger `grant` entries by `stripe_event_id`
4. Drift = expected − actual

Actual implementation (Stripe SDK call abstracted via `BillingProvider.listPaidInvoices(customerId)` — add to interface).

- [ ] **Step 5 — Test**

```ts
// packages/billing/src/reconcile.test.ts
import { describe, expect, it, vi } from "vitest";
import { reconcileWorkspace } from "./reconcile.js";

describe("reconcileWorkspace", () => {
  it("returns drift=0 when ledger matches", async () => {
    const db = { execute: vi.fn(async () => [{ kind: "grant", total: 250 }, { kind: "topup", total: 100 }]) } as never;
    const r = await reconcileWorkspace(db, "w1");
    expect(r.drift).toBe(0);
  });
});
```

- [ ] **Step 6 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(billing): dunning state machine + refund webhook + reconciliation Stripe cross-check"
```

---

## Verification

```bash
pnpm --filter @vyora/billing test
```

## Commit message

```
feat(billing): dunning state machine + refund webhook + reconciliation Stripe cross-check
```
