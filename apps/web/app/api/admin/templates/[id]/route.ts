import { NextResponse } from "next/server";

import { TemplateApi } from "@studio/api/template";
import { loadConfig } from "@studio/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  const payload = await new TemplateApi(loadConfig()).adminUpdate(id, body);
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.template.update",
      target: id,
      payload: body,
    });
  }
  return NextResponse.json(payload);
}
