import { NextResponse } from "next/server";

import { UseCaseApi } from "@vyora/api/use-cases";
import { loadConfig } from "@vyora/shared/config";

// Public list of active use cases. The Quick Create wizard's step 1 reads
// from this. Returning only active rows keeps paused/deprecated entries from
// reappearing in the picker without admin re-promotion.
export async function GET() {
  const rows = await new UseCaseApi(loadConfig()).list({ activeOnly: true });
  return NextResponse.json(rows);
}
