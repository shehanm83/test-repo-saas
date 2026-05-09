import { NextResponse } from "next/server";

import { createDb, auditLog, generations, workspaces } from "@vyora/db";
import { eq, desc } from "drizzle-orm";
import { loadConfig } from "@vyora/shared/config";

import { getServerSession } from "@/lib/auth/server";

export async function GET(_request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createDb(loadConfig().db.url, "app_admin");

  // Get all generations flagged via audit_log
  const flaggedAuditRows = await db
    .select({
      auditId: auditLog.id,
      generationId: auditLog.target,
      workspaceId: auditLog.workspaceId,
      actorUserId: auditLog.actorUserId,
      payload: auditLog.payload,
      flaggedAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.action, "generation.aup_flagged"))
    .orderBy(desc(auditLog.createdAt))
    .limit(100);

  // Enrich with generation + workspace info
  const enriched = await Promise.all(
    flaggedAuditRows.map(async (row) => {
      if (!row.generationId) return { ...row, generation: null, workspace: null };

      const [generation] = await db
        .select({ id: generations.id, brief: generations.brief, status: generations.status, createdAt: generations.createdAt })
        .from(generations)
        .where(eq(generations.id, row.generationId))
        .limit(1);

      const [workspace] = await db
        .select({ id: workspaces.id, name: workspaces.name, status: workspaces.status })
        .from(workspaces)
        .where(eq(workspaces.id, row.workspaceId))
        .limit(1);

      return { ...row, generation: generation ?? null, workspace: workspace ?? null };
    }),
  );

  return NextResponse.json({ flagged: enriched });
}
