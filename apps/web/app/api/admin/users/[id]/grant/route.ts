import { NextResponse } from "next/server";

import { createDb, workspaces } from "@vyora/db";
import { eq } from "drizzle-orm";
import { loadConfig } from "@vyora/shared/config";
import { Ledger } from "@vyora/billing";

import { getServerSession } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await props.params;
  const body = await request.json() as { amount: number; reason?: string };

  if (!body.amount || typeof body.amount !== "number" || body.amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  if (!workspace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ledger = new Ledger(db);
  const idempotencyKey = `admin-grant-ws-${id}-${Date.now()}`;

  const result = await ledger.adjustment({
    workspaceId: id,
    amount: body.amount,
    idempotencyKey,
    metadata: {
      reason: body.reason ?? "admin-grant",
      adminUserId: session.userId,
    },
  });

  await writeAdminAudit({
    workspaceId: id,
    actorUserId: session.userId,
    action: "workspace.credit_grant",
    target: id,
    payload: { amount: body.amount, reason: body.reason, idempotencyKey },
  });

  return NextResponse.json({ granted: body.amount, balanceAfter: result.balanceAfter });
}
