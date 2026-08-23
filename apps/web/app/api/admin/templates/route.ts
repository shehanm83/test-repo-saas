import { NextResponse } from "next/server";

import { TemplateApi } from "@layertone/api/template";
import { loadConfig } from "@layertone/shared/config";

import { getAdminSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function GET() {
  if (!(await getAdminSessionWorkspace())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await new TemplateApi(loadConfig()).adminList());
}

export async function POST(request: Request) {
  const context = await getAdminSessionWorkspace();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { session } = context;
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
