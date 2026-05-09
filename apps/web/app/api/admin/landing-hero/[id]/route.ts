import { NextResponse } from "next/server";

import { LandingHeroApi } from "@vyora/api/landing-hero";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";
import { createServerAdapters } from "@/lib/server/adapters";

const api = () => new LandingHeroApi(loadConfig(), createServerAdapters() as never);

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { session } = await getSessionWorkspace();
  const row = await api().update(id, await request.json());
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.landing_hero.update",
      target: id,
    });
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { session } = await getSessionWorkspace();
  await api().delete(id);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.landing_hero.delete",
      target: id,
    });
  }
  return NextResponse.json({ ok: true });
}
