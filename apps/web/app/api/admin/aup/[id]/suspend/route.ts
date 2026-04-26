import { NextResponse } from "next/server";

import { createDb, workspaces, auditLog } from "@studio/db";
import { eq } from "drizzle-orm";
import { loadConfig } from "@studio/shared";

import { getServerSession } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

// id here is the workspace ID to suspend from AUP context
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await props.params;
  const body = await request.json().catch(() => ({})) as { reason?: string; generationId?: string };

  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  await db.update(workspaces).set({ status: "suspended" }).where(eq(workspaces.id, id));

  await writeAdminAudit({
    workspaceId: id,
    actorUserId: session.userId,
    action: "workspace.aup_suspend",
    target: id,
    payload: {
      from: workspace.status,
      to: "suspended",
      reason: body.reason ?? "AUP violation",
      generationId: body.generationId,
    },
  });

  return NextResponse.json({ status: "suspended" });
}
