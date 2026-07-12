import { NextResponse } from "next/server";

import { BrandApi } from "@layertone/api/brand";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new BrandApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.get(session.workspaceId, id);
  if (!payload) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new BrandApi(loadConfig(), createServerAdapters() as never);
  let payload;
  try {
    payload = await api.update(session.workspaceId, id, await request.json());
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (!payload) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}
