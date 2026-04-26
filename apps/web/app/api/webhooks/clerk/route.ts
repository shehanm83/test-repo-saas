import { NextResponse } from "next/server";

import { ClerkWebhookHandler } from "@studio/auth";
import { loadConfig } from "@studio/shared";

export async function POST(request: Request) {
  const config = loadConfig();
  const handler = new ClerkWebhookHandler(config);
  const body = await request.text();
  const result = await handler.handle(body, request.headers);
  return NextResponse.json(result.body, { status: result.status });
}

