import { NextResponse } from "next/server";

import { GenerationApi } from "@vyora/api/generation";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new GenerationApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.get({ workspaceId: session.workspaceId, generationId: id });
  return NextResponse.json(payload);
}
