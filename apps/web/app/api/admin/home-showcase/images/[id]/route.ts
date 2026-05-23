import { NextResponse } from "next/server";

import { HomeShowcaseApi } from "@layertone/api/home-showcase";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";
import { createServerAdapters } from "@/lib/server/adapters";

const api = () => new HomeShowcaseApi(loadConfig(), createServerAdapters() as never);

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { session } = await getSessionWorkspace();
  const view = await api().deleteImage(id);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.home_showcase.image_delete",
      target: id,
    });
  }
  return NextResponse.json(view);
}
