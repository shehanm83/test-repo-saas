import { Ledger, PLANS, TOPUP_PACKS } from "@layertone/billing";
import { createDb, creditLedgerEntries, subscriptions } from "@layertone/db";
import { and, desc, eq, gte } from "@layertone/db/operators";
import { loadConfig } from "@layertone/shared/config";

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
