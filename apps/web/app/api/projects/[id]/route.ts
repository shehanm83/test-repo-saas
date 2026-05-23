import { NextResponse } from "next/server";

import { createDb, deleteProject, renameProject } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid-id" }, { status: 400 });

  const input = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 120) return NextResponse.json({ error: "invalid-name" }, { status: 400 });

  const db = createDb(loadConfig().db.url, "app_user");
  const updated = await renameProject(db, session.workspaceId, id, name);
  if (!updated) return NextResponse.json({ error: "not-found" }, { status: 404 });
  return NextResponse.json({ id: updated.id, name: updated.name });
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid-id" }, { status: 400 });

  const db = createDb(loadConfig().db.url, "app_user");
  await deleteProject(db, session.workspaceId, id);
  return NextResponse.json({ ok: true });
}
