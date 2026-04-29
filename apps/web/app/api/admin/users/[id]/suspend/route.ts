import { NextResponse } from "next/server";

import { createDb, workspaces } from "@vyora/db";
import { eq } from "drizzle-orm";
import { loadConfig } from "@vyora/shared";

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
  const body = await request.json().catch(() => ({})) as { action?: "suspend" | "ban" | "reactivate"; reason?: string };
  const action = body.action ?? "suspend";

  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  if (!workspace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newStatus = action === "reactivate" ? "active" : "suspended";

  await db.update(workspaces).set({ status: newStatus }).where(eq(workspaces.id, id));

  await writeAdminAudit({
    workspaceId: id,
    actorUserId: session.userId,
    action: `workspace.${action}`,
    target: id,
    payload: { from: workspace.status, to: newStatus, reason: body.reason },
  });

  return NextResponse.json({ status: newStatus });
}
