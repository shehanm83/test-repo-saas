import { NextResponse } from "next/server";

import { LandingHeroApi } from "@layertone/api/landing-hero";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";
import { createServerAdapters } from "@/lib/server/adapters";

const api = () => new LandingHeroApi(loadConfig(), createServerAdapters() as never);

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { session } = await getSessionWorkspace();
  const row = await api().updateSet(id, await request.json());
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.landing_hero_set.update",
      target: id,
    });
  }
  return NextResponse.json(row);
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { session } = await getSessionWorkspace();
  await api().deleteSet(id);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.landing_hero_set.delete",
      target: id,
    });
  }
  return NextResponse.json({ ok: true });
}
