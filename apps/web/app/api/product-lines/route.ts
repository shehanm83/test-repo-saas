import { NextResponse } from "next/server";

import { ProductApi } from "@vyora/api/product";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

function searchParamsToInput(request: Request) {
  const url = new URL(request.url);
  return {
    ...(url.searchParams.get("brandId") ? { brandId: url.searchParams.get("brandId")! } : {}),
    ...(url.searchParams.get("includeArchived") === "true" ? { includeArchived: true } : {}),
  };
}

export async function GET(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json([], { status: 200 });
  }

  const api = new ProductApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.listLines(session.workspaceId, searchParamsToInput(request));
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new ProductApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.createLine(session.workspaceId, await request.json());
  return NextResponse.json(payload);
}
