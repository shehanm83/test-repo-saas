import { NextResponse } from "next/server";

import { createDb, createWorkspace } from "@layertone/db";
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

  const isFree = session.workspaces.every((w) => w.planCode === "free");
  if (isFree && session.workspaces.length >= 1) {
    return NextResponse.json({ error: "workspace-limit" }, { status: 400 });
  }

  const body = (await request.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "invalid-name" }, { status: 400 });
  }

  const db = createDb(loadConfig().db.url, "app_admin");
  const workspace = await createWorkspace(db, { name, userId: session.userId });

  return NextResponse.json({ workspaceId: workspace.id });
}
