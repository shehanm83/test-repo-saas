import { NextResponse } from "next/server";

import { inviteMember, createDb } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });

  const input = await request.json().catch(() => null) as { email?: unknown; role?: unknown } | null;
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const role = typeof input?.role === "string" ? input.role : "viewer";
  if (!email || !["admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  const db = createDb(loadConfig().db.url, "app_admin");
  try {
    const result = await inviteMember(db, {
      workspaceId: session.workspaceId,
      inviteeEmail: email,
      role: role as "admin" | "editor" | "viewer",
      actorUserId: session.userId,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
