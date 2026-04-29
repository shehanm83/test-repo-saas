import { NextResponse } from "next/server";

import { createDb, generations, creditLedgerEntries } from "@vyora/db";
import { eq, and } from "drizzle-orm";
import { loadConfig } from "@vyora/shared";
import { Ledger } from "@vyora/billing";

import { getServerSession } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await props.params;
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  const [generation] = await db.select().from(generations).where(eq(generations.id, id)).limit(1);
  if (!generation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Sum up committed/reserved credits for this generation
  const entries = await db
    .select()
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.generationId, id));

  const committed = entries
    .filter((e) => e.kind === "commit" || e.kind === "reservation")
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);

  if (committed === 0) {
    return NextResponse.json({ message: "No committed credits to refund", refunded: 0 });
  }

  const ledger = new Ledger(db);
  const idempotencyKey = `admin-refund-gen-${id}`;

  await ledger.adjustment({
    workspaceId: generation.workspaceId,
    amount: committed,
    idempotencyKey,
    metadata: { reason: "admin-generation-refund", generationId: id, adminUserId: session.userId },
  });

  await writeAdminAudit({
    workspaceId: generation.workspaceId,
    actorUserId: session.userId,
    action: "generation.refund",
    target: id,
    payload: { refunded: committed, idempotencyKey },
  });

  return NextResponse.json({ refunded: committed });
}
