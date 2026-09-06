import { config } from "@layertone/shared/config";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    appUrl: config.appUrl,
    authMode: config.auth.mode,
    queueMode: config.queue.mode,
    storageMode: config.storage.mode,
    billingMode: config.billing.mode,
    aiMode: config.ai.mode,
  });
}
