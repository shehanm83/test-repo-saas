import { NextResponse } from "next/server";

import { BrandApi } from "@studio/api/brand";
import { loadConfig } from "@studio/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new BrandApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.update(session.workspaceId, id, await request.json());
  return NextResponse.json(payload);
}
