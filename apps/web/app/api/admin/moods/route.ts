import { NextResponse } from "next/server";

import { MoodApi } from "@vyora/api/mood";
import { loadConfig } from "@vyora/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function GET() {
  return NextResponse.json(await new MoodApi(loadConfig()).adminList());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const payload = await new MoodApi(loadConfig()).adminCreate(await request.json());
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.mood.create",
      target: payload.id,
      payload,
    });
  }
  return NextResponse.json(payload);
}
