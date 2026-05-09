import { NextResponse } from "next/server";

import { TaxonomyApi } from "@vyora/api/taxonomy";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new TaxonomyApi(loadConfig());

export async function GET() {
  return NextResponse.json(await api().listStrengths());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const created = await api().createStrength(body);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.taxonomy.strength.create",
      target: created.code,
      payload: created,
    });
  }
  return NextResponse.json(created);
}
