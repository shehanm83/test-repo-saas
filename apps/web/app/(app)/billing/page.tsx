import { Ledger, PLANS, TOPUP_PACKS } from "@vyora/billing";
import { createDb, creditLedgerEntries } from "@vyora/db";
import { desc, eq } from "@vyora/db/operators";
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
  const db = createDb(loadConfig().db.url, "app_admin");
  const ledger = new Ledger(db);
  const balance = session.workspaceId ? await ledger.getBalance(session.workspaceId) : 0;
  const sparklineRows = session.workspaceId
    ? await db
        .select()
        .from(creditLedgerEntries)
        .where(eq(creditLedgerEntries.workspaceId, session.workspaceId))
        .orderBy(desc(creditLedgerEntries.createdAt))
        .limit(30)
    : [];
  const invoices = workspace?.stripeCustomerId
    ? await createServerAdapters().billing.listPaidInvoices({
        customerId: workspace.stripeCustomerId,
      })
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

  return (
    <BillingPage
      balance={balance}
      invoices={invoices}
      planCode={planCode}
      sparkline={sparklineRows.map((row) => Math.abs(row.amount)).reverse()}
      topupPacks={topupPacks}
      plans={plans}
      monthlyCreditGrant={monthlyCreditGrant}
    />
  );
}
