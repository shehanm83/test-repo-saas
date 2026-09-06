import { NextResponse } from "next/server";

import { changeRole, revokeMember, createDb } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";

export async function PATCH(request: Request, props: { params: Promise<{ userId: string }> }) {
  const { userId } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });

  const input = await request.json().catch(() => null) as { role?: unknown } | null;
  const role = typeof input?.role === "string" ? input.role : "";
  if (!["admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "invalid-role" }, { status: 400 });
  }

  const db = createDb(loadConfig().db.url, "app_admin");
  try {
    await changeRole(db, {
      workspaceId: session.workspaceId,
      targetUserId: userId,
      newRole: role as "admin" | "editor" | "viewer",
      actorUserId: session.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_request: Request, props: { params: Promise<{ userId: string }> }) {
  const { userId } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });

  const db = createDb(loadConfig().db.url, "app_admin");
  try {
    await revokeMember(db, {
      workspaceId: session.workspaceId,
      targetUserId: userId,
      actorUserId: session.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
