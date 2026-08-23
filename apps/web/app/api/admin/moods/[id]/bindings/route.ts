import { NextResponse } from "next/server";

import { MoodApi } from "@layertone/api/mood";
import { loadConfig } from "@layertone/shared/config";

import { getAdminSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSessionWorkspace())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await props.params;
  return NextResponse.json(await new MoodApi(loadConfig()).adminBindings(id));
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const context = await getAdminSessionWorkspace();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await props.params;
  const bindings = await request.json();
  const api = new MoodApi(loadConfig());
  await api.adminSetBindings(id, bindings);

  if (context.session.workspaceId) {
    await writeAdminAudit({
      workspaceId: context.session.workspaceId,
      actorUserId: context.session.userId,
      action: "admin.mood.bindings_update",
      target: id,
      payload: { count: Array.isArray(bindings) ? bindings.length : 0 },
    });
  }
  return NextResponse.json(await api.adminBindings(id));
}
