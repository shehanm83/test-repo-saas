import { NextResponse } from "next/server";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function GET() {
  const { workspace } = await getSessionWorkspace();
  if (!workspace?.stripeCustomerId) {
    return NextResponse.json([], { status: 200 });
  }

  const payload = await createServerAdapters().billing.listPaidInvoices({
    customerId: workspace.stripeCustomerId,
  });

  return NextResponse.json(payload);
}

