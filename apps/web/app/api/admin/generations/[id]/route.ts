import { NextResponse } from "next/server";

import { createDb, generations, generationVariants, creditLedgerEntries, auditLog, workspaces } from "@vyora/db";
import { eq, desc } from "drizzle-orm";
import { loadConfig } from "@vyora/shared";

import { getServerSession } from "@/lib/auth/server";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await props.params;
  const db = createDb(loadConfig().db.url, "app_admin");

  const [generation] = await db.select().from(generations).where(eq(generations.id, id)).limit(1);
  if (!generation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const variants = await db
    .select()
    .from(generationVariants)
    .where(eq(generationVariants.generationId, id));

  const ledgerEntries = await db
    .select()
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.generationId, id))
    .orderBy(desc(creditLedgerEntries.createdAt));

  const auditEntries = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.target, id))
    .orderBy(desc(auditLog.createdAt));

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name, status: workspaces.status })
    .from(workspaces)
    .where(eq(workspaces.id, generation.workspaceId))
    .limit(1);

  return NextResponse.json({ generation, variants, ledgerEntries, auditEntries, workspace });
}
