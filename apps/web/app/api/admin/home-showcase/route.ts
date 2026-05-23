import { NextResponse } from "next/server";

import { HomeShowcaseApi } from "@layertone/api/home-showcase";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";
import { createServerAdapters } from "@/lib/server/adapters";

const api = () => new HomeShowcaseApi(loadConfig(), createServerAdapters() as never);

export async function GET() {
  return NextResponse.json(await api().getAdminView());
}

export async function PUT(request: Request) {
  const { session } = await getSessionWorkspace();
  const view = await api().updateConfig(await request.json());
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.home_showcase.update",
      target: "singleton",
    });
  }
  return NextResponse.json(view);
}
