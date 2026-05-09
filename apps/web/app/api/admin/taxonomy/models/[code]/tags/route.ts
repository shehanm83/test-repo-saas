import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const { tagCode } = (await request.json()) as { tagCode: string };
  await api().assignTag(code, tagCode);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.model.tag.assign",
      target: code,
      payload: { tagCode },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { session } = await getSessionWorkspace();
  const { tagCode } = (await request.json()) as { tagCode: string };
  await api().removeTag(code, tagCode);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.model.tag.remove",
      target: code,
      payload: { tagCode },
    });
  }
  return NextResponse.json({ ok: true });
}
