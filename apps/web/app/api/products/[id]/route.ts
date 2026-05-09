import { NextResponse } from "next/server";

import { ProductApi } from "@vyora/api/product";
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

  const api = new ProductApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.get(session.workspaceId, id);
  if (!payload) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}

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
  const payload = await api.update(session.workspaceId, id, await request.json());
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
  const payload = await api.archive(session.workspaceId, id);
  return NextResponse.json(payload);
}
