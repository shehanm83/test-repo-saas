import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rows = await api().listTags();
  const row = rows.find((r) => r.code === code);
  return row ? NextResponse.json(row) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const updated = await api().updateTag(code, body);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.tag.update",
      target: code,
      payload: updated,
    });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  await api().deleteTag(code);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.tag.delete",
      target: code,
    });
  }
  return NextResponse.json({ ok: true });
}
