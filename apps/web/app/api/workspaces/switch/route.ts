import { NextResponse } from "next/server";

import { ACTIVE_WORKSPACE_COOKIE, getServerSession } from "@/lib/auth/server";
import { createDb, switchActiveWorkspace } from "@layertone/db";
import { createAdapters } from "@layertone/shared/adapters";
import { loadConfig } from "@layertone/shared/config";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { workspaceId } = (await request.json()) as { workspaceId?: unknown };
  if (typeof workspaceId !== "string" || workspaceId.length === 0) {
    return NextResponse.json({ error: "invalid-workspace" }, { status: 400 });
  }

  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");
  let result: { workspaceId: string };
  try {
    result = await switchActiveWorkspace(db, {
      workspaceId,
      userId: session.userId,
    });
  } catch {
    return NextResponse.json({ error: "workspace-access-denied" }, { status: 403 });
  }

  const adapters = createAdapters(config);
  await adapters.auth
    .setActiveWorkspace(session.authUserId, result.workspaceId)
    .catch(() => undefined);

  const response = NextResponse.json({ ok: true, workspaceId: result.workspaceId });
  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, result.workspaceId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
