import { NextResponse } from "next/server";

import { BrandApi } from "@vyora/api/brand";
import { BrandNameTakenError, createDb, listBrands } from "@vyora/db";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function GET() {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json([], { status: 200 });
  }

  const brands = await listBrands(createDb(loadConfig().db.url, "app_user"), session.workspaceId);
  return NextResponse.json(brands);
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new BrandApi(loadConfig(), createServerAdapters() as never);
  try {
    const payload = await api.create(session.workspaceId, await request.json());
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof BrandNameTakenError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 409 });
    }
    throw err;
  }
}
