import { createDb, workspaces } from "@studio/db";
import { loadConfig } from "@studio/shared/config";

import { StripeBillingProvider } from "../src/stripe";
import { reconcileWorkspace } from "../src/reconcile";

const config = loadConfig();
const db = createDb(config.db.url, "app_admin");
const billing =
  config.billing.mode === "stub"
    ? undefined
    : new StripeBillingProvider({
        secretKey: config.billing.stripeSecretKey!,
        webhookSecret: config.billing.webhookSecret!,
        topupPrices: config.billing.topupPrices,
      });
const allWorkspaces = await db.select().from(workspaces);

let drifts = 0;
for (const workspace of allWorkspaces) {
  const report = await reconcileWorkspace(db, workspace.id, {
    ...(billing ? { billing } : {}),
    env: process.env,
  });
  if (report.drift !== 0) {
    console.error("DRIFT", JSON.stringify(report));
    drifts += 1;
  }
}

console.warn(`reconciled ${allWorkspaces.length} workspaces, ${drifts} drift(s)`);
process.exit(drifts === 0 ? 0 : 1);
