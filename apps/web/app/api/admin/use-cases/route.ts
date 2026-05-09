import { NextResponse } from "next/server";

import { UseCaseApi } from "@vyora/api/use-cases";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

const api = () => new UseCaseApi(loadConfig());

export async function GET() {
  return NextResponse.json(await api().list());
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const body = await request.json();
  try {
    const created = await api().create(body);
    if (session.workspaceId) {
      await writeAdminAudit({
        workspaceId: session.workspaceId,
        actorUserId: session.userId,
        action: "admin.use-cases.create",
        target: created.code,
        payload: created,
      });
    }
    return NextResponse.json(created);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
