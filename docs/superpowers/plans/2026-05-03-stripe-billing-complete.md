# Stripe Billing Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all broken billing wiring and deliver a production-grade `/billing` page with working plan management, invoice PDF links, correct credit sparkline, subscription renewal date, portal redirect, and error feedback.

**Architecture:** All plan-change flows route through the Stripe Customer Portal (Option B). The only new API route is `/api/billing/subscription` for first-time subscribers who have never had a plan. The `listPaidInvoices` return type is widened to include `amount`, `date`, and `hostedInvoiceUrl` so the invoice table renders real data. Sparkline aggregation moves to the server component. All UI interactivity stays in the existing `BillingPage` client component.

**Tech Stack:** Next.js 15 App Router, Stripe SDK v22, Drizzle ORM, Zod, React 19, existing `@vyora/billing` / `@vyora/shared` / `@vyora/db` packages.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `packages/shared/src/adapters/types.ts` | Modify | Widen `listPaidInvoices` return type |
| `packages/billing/src/stripe.ts` | Modify | Return `amount`, `date`, `hostedInvoiceUrl` from Stripe invoices |
| `packages/shared/src/adapters/factory.ts` | Modify | Update stub to match new invoice shape |
| `apps/web/app/api/billing/subscription/route.ts` | Create | POST — first-time subscription checkout |
| `apps/web/app/(app)/billing/page.tsx` | Modify | Fetch subscription row; aggregate sparkline by day; pass new props |
| `apps/web/components/billing/billing-page.tsx` | Modify | Wire all buttons; add Billing Details section; fix invoice links; add error feedback; fix sparkline; add renewal date; add Popular badge |

---

## Task 1: Widen `listPaidInvoices` return type

**Files:**
- Modify: `packages/shared/src/adapters/types.ts:62-64`
- Modify: `packages/billing/src/stripe.ts:109-126`
- Modify: `packages/shared/src/adapters/factory.ts:65-67`

- [ ] **Step 1: Update the interface in `packages/shared/src/adapters/types.ts`**

Replace lines 62–64:
```ts
  listPaidInvoices(args: {
    customerId: string;
  }): Promise<Array<{ invoiceId: string; priceId: string | null }>>;
```
With:
```ts
  listPaidInvoices(args: {
    customerId: string;
  }): Promise<
    Array<{
      invoiceId: string;
      priceId: string | null;
      amount: string | null;
      date: string | null;
      hostedInvoiceUrl: string | null;
    }>
  >;
```

- [ ] **Step 2: Update `StripeBillingProvider.listPaidInvoices` in `packages/billing/src/stripe.ts`**

Replace the entire `listPaidInvoices` method (lines 109–126):
```ts
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
```

- [ ] **Step 3: Update `StubBillingProvider.listPaidInvoices` in `packages/shared/src/adapters/factory.ts`**

Replace lines 65–67:
```ts
  async listPaidInvoices(): Promise<Array<{ invoiceId: string; priceId: string | null }>> {
    return [];
  }
```
With:
```ts
  async listPaidInvoices(): Promise<
    Array<{
      invoiceId: string;
      priceId: string | null;
      amount: string | null;
      date: string | null;
      hostedInvoiceUrl: string | null;
    }>
  > {
    return [];
  }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/shehan/aiwork/commercial/noname-img
pnpm --filter @vyora/shared build 2>&1 | tail -5
pnpm --filter @vyora/billing build 2>&1 | tail -5
```
Expected: no type errors.

- [ ] **Step 5: Add `gte` to `packages/db/src/operators.ts`**

The billing page needs `gte` for date filtering. The operators barrel currently exports only `and, desc, eq, inArray, isNotNull, or, sql`. Add `gte`:

Replace line 1 of `packages/db/src/operators.ts`:
```ts
export { and, desc, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
export { count } from "drizzle-orm/sql/functions/aggregate";
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/adapters/types.ts packages/billing/src/stripe.ts packages/shared/src/adapters/factory.ts packages/db/src/operators.ts
git commit -m "feat(billing): widen listPaidInvoices + export gte from db operators"
```

---

## Task 2: Add `/api/billing/subscription` route

**Files:**
- Create: `apps/web/app/api/billing/subscription/route.ts`

- [ ] **Step 1: Create `apps/web/app/api/billing/subscription/route.ts`**

```ts
import { NextResponse } from "next/server";

import { BillingApi } from "@vyora/api/billing";
import { createDb, workspaces } from "@vyora/db";
import { eq } from "@vyora/db/operators";
import { loadConfig } from "@vyora/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(request: Request) {
  const { session, workspace } = await getSessionWorkspace();
  if (!session.workspaceId || !workspace) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const { planCode } = (await request.json()) as {
    planCode: "free" | "starter" | "pro" | "business" | "agency";
  };

  const config = loadConfig();
  const adapters = createServerAdapters();
  const db = createDb(config.db.url, "app_admin");

  let customerId = workspace.stripeCustomerId;
  if (!customerId) {
    const ensured = await adapters.billing.ensureCustomer(workspace.id, session.email);
    customerId = ensured.customerId;
    await db
      .update(workspaces)
      .set({ stripeCustomerId: customerId })
      .where(eq(workspaces.id, workspace.id));
  }

  const api = new BillingApi(config, adapters as never);
  const payload = await api.startSubscription({
    workspaceId: workspace.id,
    customerId,
    input: { planCode },
  });

  return NextResponse.json(payload);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm --filter @vyora/web build 2>&1 | grep "subscription" | head -10
```
Expected: no errors mentioning subscription route.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/billing/subscription/route.ts
git commit -m "feat(web): add /api/billing/subscription route for first-time plan checkout"
```

---

## Task 3: Update billing server page — fetch subscription + aggregate sparkline

**Files:**
- Modify: `apps/web/app/(app)/billing/page.tsx`

- [ ] **Step 1: Replace `apps/web/app/(app)/billing/page.tsx` entirely**

```tsx
import { Ledger, PLANS, TOPUP_PACKS } from "@vyora/billing";
import { createDb, creditLedgerEntries, subscriptions } from "@vyora/db";
import { and, desc, eq, gte } from "@vyora/db/operators";
import { loadConfig } from "@vyora/shared";

import { BillingPage } from "@/components/billing/billing-page";
import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

const PLAN_DISPLAY: Array<{
  code: keyof typeof PLANS;
  name: string;
  popular?: boolean;
}> = [
  { code: "free", name: "Free" },
  { code: "starter", name: "Starter" },
  { code: "pro", name: "Pro", popular: true },
  { code: "business", name: "Business" },
  { code: "agency", name: "Agency" },
];

const BEST_PACK = "p750";

export default async function BillingRoutePage() {
  const { session, workspace } = await getSessionWorkspace();
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");
  const ledger = new Ledger(db);

  const balance = session.workspaceId ? await ledger.getBalance(session.workspaceId) : 0;

  // Aggregate sparkline: sum of absolute commit amounts per day, last 30 days
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const ledgerRows = session.workspaceId
    ? await db
        .select()
        .from(creditLedgerEntries)
        .where(
          and(
            eq(creditLedgerEntries.workspaceId, session.workspaceId),
            eq(creditLedgerEntries.kind, "commit"),
            gte(creditLedgerEntries.createdAt, since),
          ),
        )
        .orderBy(desc(creditLedgerEntries.createdAt))
    : [];

  // Group by day (YYYY-MM-DD) → sum of credits used that day
  const dayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of ledgerRows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) ?? 0) + Math.abs(row.amount));
    }
  }
  const sparkline = Array.from(dayMap.values()).reverse();

  // Invoices from Stripe
  const invoices = workspace?.stripeCustomerId
    ? await createServerAdapters().billing.listPaidInvoices({
        customerId: workspace.stripeCustomerId,
      })
    : [];

  // Subscription row for renewal date
  const [sub] = session.workspaceId
    ? await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.workspaceId, session.workspaceId))
        .limit(1)
    : [];

  const planCode = workspace?.planCode ?? "free";
  const monthlyCreditGrant =
    PLANS[planCode as keyof typeof PLANS]?.monthlyCreditGrant ?? 30;

  const plans = PLAN_DISPLAY.map((p) => ({
    code: p.code,
    name: p.name,
    price: PLANS[p.code].price,
    brands: PLANS[p.code].brandQuota,
    seats: PLANS[p.code].seatQuota,
    credits: PLANS[p.code].monthlyCreditGrant,
    ...(p.popular ? { popular: true } : {}),
  }));

  const topupPacks = Object.values(TOPUP_PACKS).map((t) => ({
    code: t.code,
    credits: t.credits,
    priceUsd: t.priceUsd,
    ...(t.code === BEST_PACK ? { best: true } : {}),
  }));

  const periodEnd = sub?.currentPeriodEnd ?? null;

  return (
    <BillingPage
      balance={balance}
      invoices={invoices}
      planCode={planCode}
      sparkline={sparkline}
      topupPacks={topupPacks}
      plans={plans}
      monthlyCreditGrant={monthlyCreditGrant}
      periodEnd={periodEnd ? periodEnd.toISOString() : null}
      subscriptionStatus={sub?.status ?? null}
      cancelAtPeriodEnd={sub?.cancelAtPeriodEnd ?? false}
    />
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm --filter @vyora/web build 2>&1 | tail -10
```
Expected: no errors on billing page.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(app)/billing/page.tsx
git commit -m "feat(web): billing page — fetch subscription row, aggregate sparkline by day, pass periodEnd"
```

---

## Task 4: Rewrite `billing-page.tsx` — production-grade UI

**Files:**
- Modify: `apps/web/components/billing/billing-page.tsx`

This is the main UI task. Replace the entire file.

- [ ] **Step 1: Replace `apps/web/components/billing/billing-page.tsx` entirely**

```tsx
"use client";

import React, { useState } from "react";

import { I } from "@/components/icons";

interface Invoice {
  invoiceId: string;
  priceId: string | null;
  amount: string | null;
  date: string | null;
  hostedInvoiceUrl: string | null;
}

interface Props {
  balance: number;
  invoices: Invoice[];
  planCode: string;
  sparkline: number[];
  topupPacks: Array<{ code: string; credits: number; priceUsd: number; best?: boolean }>;
  plans: Array<{
    code: string;
    name: string;
    price: number;
    brands: number;
    seats: number;
    credits: number;
    popular?: boolean;
  }>;
  monthlyCreditGrant: number;
  periodEnd: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{value}</div>
      <div className="t-small" style={{ fontSize: 11 }}>
        {label}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 600;
  const h = 60;
  const max = Math.max(1, ...values);
  const stride = w / Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => `${(i * stride).toFixed(1)},${(h - (v / max) * (h - 12)).toFixed(1)}`)
    .join(" ");
  const polygon = values.length ? `0,${h} ${points} ${w},${h}` : `0,${h} ${w},${h}`;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="var(--studio-violet)" strokeWidth={2} />
      <polygon points={polygon} fill="var(--studio-violet)" opacity={0.08} />
    </svg>
  );
}

function usePortalRedirect() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const json = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !json.url) {
        setError(json.error ?? "Failed to open billing portal. Please try again.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return { openPortal, pending, error, clearError: () => setError(null) };
}

export function BillingPage(props: Props) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [pendingTopup, setPendingTopup] = useState<string | null>(null);
  const [topupError, setTopupError] = useState<string | null>(null);
  const portal = usePortalRedirect();

  const currentPlan = props.plans.find((p) => p.code === props.planCode);
  const planLabel = currentPlan?.name ?? props.planCode;
  const planPrice = currentPlan?.price ?? 0;

  const renewalLabel = (() => {
    if (!props.periodEnd) return null;
    const d = new Date(props.periodEnd);
    if (props.cancelAtPeriodEnd) {
      return `Cancels on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return `Renews on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  const creditResetLabel = props.periodEnd
    ? `Resets on ${new Date(props.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : `${props.monthlyCreditGrant.toLocaleString()} credits / month`;

  async function buyTopup(code: string) {
    setPendingTopup(code);
    setTopupError(null);
    try {
      const r = await fetch("/api/billing/topup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packCode: code }),
      });
      const json = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !json.url) {
        setTopupError(json.error ?? "Failed to start checkout. Please try again.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setTopupError("Network error. Please check your connection and try again.");
    } finally {
      setPendingTopup(null);
    }
  }

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Billing &amp; plan</h1>
          <p className="page__sub">Manage your subscription, credits, and payment method.</p>
        </div>
      </div>

      {/* Section 1 — Current plan */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div>
          <div className="t-eyebrow">Current plan</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
            <h2 className="t-h2" style={{ margin: 0 }}>
              {planLabel}
            </h2>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--fg-3)" }}>
              ${planPrice}
              <span style={{ fontSize: 13, marginLeft: 2, color: "var(--fg-3)" }}>/mo</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <Stat label="Brands included" value={currentPlan?.brands ?? "—"} />
            <Stat label="Seats included" value={currentPlan?.seats ?? "—"} />
            <Stat
              label="Monthly credits"
              value={(currentPlan?.credits ?? props.monthlyCreditGrant).toLocaleString()}
            />
          </div>
          {renewalLabel ? (
            <div className="t-small" style={{ marginTop: 10, color: "var(--fg-3)" }}>
              {props.subscriptionStatus === "past_due" ? (
                <span style={{ color: "var(--color-error, #e53e3e)" }}>
                  <I.AlertTriangle size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                  Payment past due — update your payment method to avoid interruption
                </span>
              ) : (
                renewalLabel
              )}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setCompareOpen((o) => !o)}
            >
              Compare plans
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={portal.pending}
              onClick={() => void portal.openPortal()}
            >
              {portal.pending ? "Redirecting…" : "Change plan"}
            </button>
          </div>
          {portal.error ? (
            <div style={{ fontSize: 12, color: "var(--color-error, #e53e3e)", maxWidth: 280, textAlign: "right" }}>
              {portal.error}
            </div>
          ) : null}
        </div>
      </div>

      {/* Section 2 — Credits */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="t-eyebrow">Credits</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 48, marginTop: 4 }}>
              {props.balance.toLocaleString()}{" "}
              <span style={{ fontSize: 16, color: "var(--fg-3)", fontFamily: "var(--font-body)", fontWeight: 400 }}>
                credits remaining
              </span>
            </div>
            <div className="t-small" style={{ marginTop: 4 }}>
              {creditResetLabel}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a className="btn btn--accent" href="#topups">
              <I.Plus size={14} />
              Buy top-up credits
            </a>
          </div>
        </div>
        <div
          style={{
            marginTop: 24,
            height: 80,
            background: "var(--cal-gray-50)",
            borderRadius: 10,
            padding: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Sparkline values={props.sparkline} />
          <div style={{ position: "absolute", left: 16, top: 12, fontSize: 11, color: "var(--fg-3)" }}>
            Last 30 days · {props.sparkline.reduce((a, b) => a + b, 0)} credits used
          </div>
        </div>
      </div>

      {/* Section 3 — Top-up packs */}
      <div id="topups" style={{ marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>
          Top-up packs
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {props.topupPacks.map((t) => (
            <div key={t.code} className="card" style={{ padding: 20, position: "relative" }}>
              {t.best ? (
                <div className="pill pill--accent" style={{ position: "absolute", top: -10, left: 16 }}>
                  Best value
                </div>
              ) : null}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28 }}>
                {t.credits.toLocaleString()} credits
              </div>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>${t.priceUsd}</div>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={pendingTopup === t.code}
                  onClick={() => void buyTopup(t.code)}
                >
                  {pendingTopup === t.code ? "Redirecting…" : "Buy"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {topupError ? (
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--color-error, #e53e3e)" }}>
            {topupError}
          </div>
        ) : null}
        <div className="t-small" style={{ marginTop: 12 }}>
          <I.Info size={11} style={{ verticalAlign: "-1px" }} /> Top-up credits never expire.
        </div>
      </div>

      {/* Section 4 — Billing details */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>
          Billing details
        </div>
        <p style={{ fontSize: 14, color: "var(--fg-3)", margin: "0 0 16px" }}>
          Manage your payment method, billing address, tax ID, and subscription from the Stripe
          Customer Portal.
        </p>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={portal.pending}
          onClick={() => void portal.openPortal()}
        >
          {portal.pending ? "Opening portal…" : "Manage in Stripe Customer Portal"}
        </button>
        {portal.error ? (
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--color-error, #e53e3e)" }}>
            {portal.error}
          </div>
        ) : null}
      </div>

      {/* Section 5 — Invoices */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div
          style={{ padding: "16px 24px", borderBottom: "1px solid var(--cal-gray-200)" }}
          className="t-eyebrow"
        >
          Invoices
        </div>
        {props.invoices.length === 0 ? (
          <div style={{ padding: "24px", color: "var(--fg-3)", fontSize: 14 }}>
            No invoices yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--cal-gray-50)" }}>
                {["Invoice", "Date", "Amount", "Status", ""].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: "left",
                      padding: "10px 24px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--fg-3)",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.invoices.map((iv) => (
                <tr key={iv.invoiceId} style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                  <td style={{ padding: "12px 24px", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                    {iv.invoiceId.slice(0, 12)}
                  </td>
                  <td style={{ padding: "12px 24px", fontSize: 14 }}>{iv.date ?? "—"}</td>
                  <td style={{ padding: "12px 24px", fontSize: 14 }}>{iv.amount ?? "—"}</td>
                  <td style={{ padding: "12px 24px" }}>
                    <span className="pill pill--green">
                      <I.Check size={11} />
                      Paid
                    </span>
                  </td>
                  <td style={{ padding: "12px 24px", textAlign: "right" }}>
                    {iv.hostedInvoiceUrl ? (
                      <a
                        href={iv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--ghost btn--sm"
                      >
                        <I.Download size={12} />
                        PDF
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 6 — Plan comparison (accordion) */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          onClick={() => setCompareOpen((o) => !o)}
          style={{
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <div className="t-eyebrow" style={{ margin: 0 }}>
            Plan comparison
          </div>
          <I.ChevronDown size={14} style={{ transform: compareOpen ? "rotate(180deg)" : "" }} />
        </div>
        {compareOpen ? (
          <div style={{ padding: "0 24px 24px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th />
                  {props.plans.map((p) => (
                    <th
                      key={p.code}
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        position: "relative",
                      }}
                    >
                      {p.name}
                      {p.popular ? (
                        <span
                          className="pill pill--accent"
                          style={{ marginLeft: 8, fontSize: 10, verticalAlign: "middle" }}
                        >
                          Popular
                        </span>
                      ) : null}
                      {p.code === props.planCode ? (
                        <span
                          className="pill pill--green"
                          style={{ marginLeft: 8, fontSize: 10, verticalAlign: "middle" }}
                        >
                          Current
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--fg-3)" }}>Price</td>
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "8px 16px" }}>
                      ${p.price}/mo
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--fg-3)" }}>Brands</td>
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "8px 16px" }}>
                      {p.brands}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--fg-3)" }}>Seats</td>
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "8px 16px" }}>
                      {p.seats === 999 ? "Unlimited" : p.seats}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--fg-3)" }}>Credits / mo</td>
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "8px 16px" }}>
                      {p.credits.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td />
                  {props.plans.map((p) => (
                    <td key={p.code} style={{ padding: "12px 16px" }}>
                      {p.code === props.planCode ? (
                        <span style={{ fontSize: 13, color: "var(--fg-3)" }}>Current plan</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          disabled={portal.pending}
                          onClick={() => void portal.openPortal()}
                        >
                          {p.price > (currentPlan?.price ?? 0) ? "Upgrade" : "Switch"}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm --filter @vyora/web build 2>&1 | grep -i "error\|billing" | head -20
```
Expected: no type errors related to billing.

- [ ] **Step 3: Check for `I.AlertTriangle` icon availability**

```bash
grep -n "AlertTriangle\|ChevronDown\|Info\|Check\|Download\|Plus" /home/shehan/aiwork/commercial/noname-img/apps/web/components/icons.tsx | head -20
```

If `AlertTriangle` is missing, replace the line in the component:
```tsx
<I.AlertTriangle size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
```
with:
```tsx
⚠️{" "}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/billing/billing-page.tsx
git commit -m "feat(web): production-grade billing page — portal wiring, invoice links, sparkline, renewal date, error feedback"
```

---

## Task 5: Verify end-to-end

- [ ] **Step 1: Start dev server**

```bash
pnpm --filter @vyora/web dev &
```

- [ ] **Step 2: Navigate to `/billing`**

Open `http://localhost:3000/billing`. Verify:
- Plan card shows name, price, brands/seats/credits
- Credit balance renders as a number
- Sparkline area shows (may be flat if no commit entries)
- Top-up pack cards show: 200/$9, 750/$29 (Best value), 2500/$79
- "Billing details" section is visible with portal button
- "Invoices" section shows "No invoices yet." if empty
- "Plan comparison" accordion expands on click, shows Popular badge on Pro, Current badge on your plan

- [ ] **Step 3: Test portal button (requires stripe-test mode)**

With `BILLING_MODE=stripe-test` and valid `STRIPE_SECRET_KEY` and a workspace that has a `stripeCustomerId`:
- Click "Change plan" → should redirect to Stripe portal
- Click "Manage in Stripe Customer Portal" → same redirect

With `BILLING_MODE=stub`:
- Click "Change plan" → redirects to `/billing` (stub returns returnUrl)

- [ ] **Step 4: Test topup button**

With `BILLING_MODE=stub`:
- Click "Buy" on any pack → redirects to `/billing?stub=topup&pack=p200` (stub mode)

With `BILLING_MODE=stripe-test` and price IDs configured:
- Click "Buy" on p750 → opens Stripe Checkout
- Pay with `4242 4242 4242 4242`, any future expiry, any CVC
- On success: redirects to `/billing?topup=success`

- [ ] **Step 5: Test invoice table**

With `BILLING_MODE=stripe-test` after a completed payment:
- Navigate to `/billing` → invoice row shows real date, amount (`$29.00`), PDF link
- Click PDF link → opens Stripe-hosted invoice in new tab

- [ ] **Step 6: Final TypeScript check**

```bash
pnpm tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(billing): complete Stripe integration + production-grade billing UI"
```
