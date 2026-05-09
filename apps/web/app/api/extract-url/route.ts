import { NextResponse } from "next/server";

import { BrandApi } from "@vyora/api/brand";
import { loadConfig } from "@vyora/shared/config";

import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(request: Request): Promise<Response> {
  const api = new BrandApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.extractFromUrl(await request.json());
  return NextResponse.json(payload);
}
