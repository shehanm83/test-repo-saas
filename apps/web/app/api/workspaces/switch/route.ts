import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { createAdapters, loadConfig } from "@studio/shared";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { workspaceId } = (await request.json()) as { workspaceId: string };
  const adapters = createAdapters(loadConfig());
  await adapters.auth.setActiveWorkspace(session.authUserId, workspaceId);

  return NextResponse.json({ ok: true });
}

