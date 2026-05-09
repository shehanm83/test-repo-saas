import { NextResponse } from "next/server";

import { UseCaseApi } from "@vyora/api/use-cases";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new UseCaseApi(loadConfig());

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = await api().get(code);
  return row ? NextResponse.json(row) : NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  try {
    const updated = await api().update(code, body);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (session.workspaceId) {
      await writeAdminAudit({
        workspaceId: session.workspaceId,
        actorUserId: session.userId,
        action: "admin.use-cases.update",
        target: code,
        payload: updated,
      });
    }
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  await api().delete(code);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.use-cases.delete",
      target: code,
    });
  }
  return NextResponse.json({ ok: true });
}
