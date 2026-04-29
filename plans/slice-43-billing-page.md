# Slice 43 — Billing page

**Phase:** 14
**Depends on:** 36, 32, 33
**Spec references:** [UI Prompt 10 — Billing & plan](../specs/2026-04-25-studio-v1-ui-prompts.md).

**Definition of done:**
- `/billing` page shows current plan, credit balance with sparkline, top-up packs, billing details (Customer Portal link), invoices, plan-comparison accordion
- Buy top-up packs → opens Stripe Checkout
- Manage Plan → opens Stripe Customer Portal
- Invoice list pulled from Stripe API server-side
- Server component for the page; client island for sparkline + buttons

---

## Files

**Create:**
- `apps/web/src/app/(app)/billing/page.tsx`
- `apps/web/src/components/billing/{plan-card.tsx,credit-display.tsx,topup-packs.tsx,invoices-table.tsx,plan-comparison.tsx,sparkline.tsx}`
- API routes: `/api/billing/topup` (POST), `/api/billing/portal` (POST), `/api/billing/invoices` (GET)

---

## Tasks

(Implement per UI Prompt 10. Server fetches plan + balance + invoices from Stripe + ledger; client renders with light interactivity.)

Key bits:

```tsx
// /api/billing/topup
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { BillingApi } from "@vyora/api";
import { loadConfig, createAdapters } from "@vyora/shared";
import { createDb, workspaces } from "@vyora/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const s = await getServerSession();
  if (!s?.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  const { packCode } = (await req.json()) as { packCode: "p200"|"p750"|"p2500" };
  const cfg = loadConfig(); const adapters = createAdapters(cfg);
  const db = createDb(cfg.db.url, "app_admin");
  const [w] = await db.select().from(workspaces).where(eq(workspaces.id, s.workspaceId));
  if (!w?.stripeCustomerId) {
    const { customerId } = await adapters.billing.ensureCustomer(w.id, "owner@example.com");
    await db.update(workspaces).set({ stripeCustomerId: customerId }).where(eq(workspaces.id, w.id));
    w.stripeCustomerId = customerId;
  }
  const api = new BillingApi(cfg, adapters);
  const out = await api.startTopup({ workspaceId: w.id, customerId: w.stripeCustomerId, input: { packCode } });
  return NextResponse.json(out);
}
```

```tsx
// /api/billing/portal
export async function POST() {
  const s = await getServerSession();
  if (!s?.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  const cfg = loadConfig(); const adapters = createAdapters(cfg);
  const db = createDb(cfg.db.url, "app_admin");
  const [w] = await db.select().from(workspaces).where(eq(workspaces.id, s.workspaceId));
  if (!w?.stripeCustomerId) return NextResponse.json({ error: "no-customer" }, { status: 400 });
  const out = await adapters.billing.customerPortalUrl({ customerId: w.stripeCustomerId, returnUrl: `${cfg.appUrl}/billing` });
  return NextResponse.json(out);
}
```

For sparkline: aggregate the past 30 days of `commit` entries by day from `credit_ledger_entries` and render with a small SVG component.

- [ ] **Commit**

```bash
pnpm --filter @vyora/web test
git add -A
git commit -m "feat(web): billing page with plan card, credit balance, top-ups, customer portal, invoices"
```

---

## Verification

```bash
BILLING_MODE=stripe-test pnpm dev   # full top-up roundtrip with Stripe CLI forwarding
```

## Commit message

```
feat(web): billing page with plan card, credit balance, top-ups, customer portal, invoices
```
