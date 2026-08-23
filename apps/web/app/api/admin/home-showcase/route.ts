import { NextResponse } from "next/server";

import { HomeShowcaseApi } from "@layertone/api/home-showcase";
import { loadConfig } from "@layertone/shared/config";

import { getAdminSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";
import { createServerAdapters } from "@/lib/server/adapters";

const api = () => new HomeShowcaseApi(loadConfig(), createServerAdapters() as never);

export async function GET() {
  if (!(await getAdminSessionWorkspace())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await api().getAdminView());
}

export async function PUT(request: Request) {
  const context = await getAdminSessionWorkspace();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { session } = context;
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
