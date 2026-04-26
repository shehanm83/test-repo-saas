import { NextResponse } from "next/server";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";
import { loadConfig } from "@studio/shared";

export async function POST() {
  const { workspace } = await getSessionWorkspace();
  if (!workspace?.stripeCustomerId) {
    return NextResponse.json({ error: "no-customer" }, { status: 400 });
  }

  const payload = await createServerAdapters().billing.customerPortalUrl({
    customerId: workspace.stripeCustomerId,
    returnUrl: `${loadConfig().appUrl}/billing`,
  });

  return NextResponse.json(payload);
}

