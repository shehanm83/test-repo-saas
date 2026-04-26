import { Ledger } from "@studio/billing";
import { createDb, creditLedgerEntries } from "@studio/db";
import { desc, eq } from "@studio/db/operators";
import { loadConfig } from "@studio/shared";

import { BillingPage } from "@/components/billing/billing-page";
import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

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

  return (
    <BillingPage
      balance={balance}
      invoices={invoices}
      planCode={workspace?.planCode ?? "free"}
      sparkline={sparklineRows.map((row) => Math.abs(row.amount)).reverse()}
    />
  );
}
