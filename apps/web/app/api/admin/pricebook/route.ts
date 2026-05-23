import { NextResponse } from "next/server";

import { PricebookApi } from "@layertone/api/pricebook";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function GET() {
  return NextResponse.json(await new PricebookApi(loadConfig()).list());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const payload = await new PricebookApi(loadConfig()).insert(await request.json());
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.pricebook.insert",
      target: payload.id,
      payload,
    });
  }
  return NextResponse.json(payload);
}
