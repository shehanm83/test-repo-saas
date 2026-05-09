import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const { strengthCode } = (await request.json()) as { strengthCode: string };
  await api().assignStrength(code, strengthCode);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.model.strength.assign",
      target: code,
      payload: { strengthCode },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const { strengthCode } = (await request.json()) as { strengthCode: string };
  await api().removeStrength(code, strengthCode);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.model.strength.remove",
      target: code,
      payload: { strengthCode },
    });
  }
  return NextResponse.json({ ok: true });
}
