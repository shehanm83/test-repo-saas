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

  try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal-error";
    const status = message.startsWith("missing-stripe-price") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
