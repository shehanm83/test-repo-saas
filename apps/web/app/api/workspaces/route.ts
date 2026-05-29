import { NextResponse } from "next/server";

import { createDb, createWorkspace, workspaceMembers, workspaces } from "@layertone/db";
import { and, eq, isNotNull } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { getServerSession } from "@/lib/auth/server";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(session.workspaces);
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createDb(loadConfig().db.url, "app_admin");

  // Query ALL accepted workspaces (including suspended) to check plan entitlement.
  // session.workspaces only contains active workspaces, so a user whose subscription
  // workspace is suspended would appear to have 0 free workspaces — bypassing the cap.
  const allWs = await db
    .select({ planCode: workspaces.planCode })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, session.userId), isNotNull(workspaceMembers.acceptedAt)));

  const isFree = allWs.every((w) => w.planCode === "free");
  if (isFree && allWs.length >= 1) {
    return NextResponse.json({ error: "workspace-limit" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "invalid-name" }, { status: 400 });
  }

  const workspace = await createWorkspace(db, { name, userId: session.userId });
  return NextResponse.json({ workspaceId: workspace.id });
}
