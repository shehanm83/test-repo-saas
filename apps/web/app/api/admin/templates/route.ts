import { NextResponse } from "next/server";

import { TemplateApi } from "@vyora/api/template";
import { loadConfig } from "@vyora/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function GET() {
  return NextResponse.json(await new TemplateApi(loadConfig()).adminList());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const payload = await new TemplateApi(loadConfig()).adminCreate(await request.json());
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.template.create",
      target: payload.id,
      payload,
    });
  }
  return NextResponse.json(payload);
}
