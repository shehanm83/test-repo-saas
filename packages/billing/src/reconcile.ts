import { workspaces, type Db } from "@vyora/db";
import { eq, sql } from "drizzle-orm";

import { PLANS, planFromStripePriceId } from "./plans";

interface BillingReconciliationProvider {
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
}

export interface ReconciliationReport {
  workspaceId: string;
  drift: number;
  expectedTopupCredits: number;
  actualTopupCredits: number;
  expectedGrantCredits: number;
  actualGrantCredits: number;
}

export async function reconcileWorkspace(
  db: Db,
  workspaceId: string,
  opts: {
    billing?: BillingReconciliationProvider;
    env?: Record<string, string | undefined>;
  } = {},
): Promise<ReconciliationReport> {
  const rows = await db.execute<{ kind: string; total: number }>(sql`
    SELECT kind, COALESCE(SUM(amount), 0)::int AS total
    FROM credit_ledger_entries
    WHERE workspace_id = ${workspaceId} AND kind IN ('topup', 'grant')
    GROUP BY kind
  `);

  const actualTopupCredits = rows.find((row) => row.kind === "topup")?.total ?? 0;
  const actualGrantCredits = rows.find((row) => row.kind === "grant")?.total ?? 0;
  let expectedGrantCredits = actualGrantCredits;

  if (opts.billing) {
    const [workspace] = await db
      .select({ stripeCustomerId: workspaces.stripeCustomerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    if (workspace?.stripeCustomerId) {
      const invoices = await opts.billing.listPaidInvoices({
        customerId: workspace.stripeCustomerId,
      });

      expectedGrantCredits = invoices.reduce((total, invoice) => {
        if (!invoice.priceId) {
          return total;
        }

        const planCode = planFromStripePriceId(opts.env ?? process.env, invoice.priceId);
        if (!planCode) {
          return total;
        }

        return total + PLANS[planCode].monthlyCreditGrant;
      }, 0);
    }
  }

  return {
    workspaceId,
    drift: expectedGrantCredits - actualGrantCredits,
    expectedTopupCredits: actualTopupCredits,
    actualTopupCredits,
    expectedGrantCredits,
    actualGrantCredits,
  };
}
