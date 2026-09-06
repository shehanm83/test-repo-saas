import { NextResponse } from "next/server";

import { ProductApi } from "@layertone/api/product";
import { loadConfig } from "@layertone/shared/config";

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

  const api = new ProductApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.updateLine(session.workspaceId, id, await request.json());
  return NextResponse.json(payload);
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new ProductApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.archiveLine(session.workspaceId, id);
  return NextResponse.json(payload);
}
