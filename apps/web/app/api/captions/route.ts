import { NextResponse } from "next/server";

import { CaptionApi } from "@studio/api/caption";
import { loadConfig } from "@studio/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new CaptionApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.create({
    workspaceId: session.workspaceId,
    userId: session.userId,
    input: await request.json(),
  });

  return NextResponse.json(payload);
}
