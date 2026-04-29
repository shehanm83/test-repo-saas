import { NextResponse } from "next/server";

import { CaptionApi, rateLimit } from "@vyora/api";
import { createDb } from "@vyora/db";
import { AppError, loadConfig } from "@vyora/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

const RATE_LIMITS_BY_PLAN: Record<string, number> = {
  free: 10,
  starter: 30,
  pro: 60,
  business: 120,
  agency: 240,
};

export async function POST(request: Request) {
  const { session, workspace } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json(
      { error: { code: "auth.no_workspace", message: "No active workspace.", requestId: crypto.randomUUID() } },
      { status: 400 },
    );
  }

  const config = loadConfig();
  const adminDb = createDb(config.db.url, "app_admin");
  const planCode = workspace?.planCode ?? "free";

  try {
    await rateLimit(
      adminDb,
      `cap:user:${session.userId}`,
      RATE_LIMITS_BY_PLAN[planCode] ?? 10,
      60,
    );

    const api = new CaptionApi(config, createServerAdapters() as never);
    const payload = await api.create({
      workspaceId: session.workspaceId,
      userId: session.userId,
      input: await request.json(),
    });
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.userMessage, requestId: crypto.randomUUID() } },
        { status: e.httpStatus },
      );
    }
    const typed = e as Error & { code?: string; httpStatus?: number };
    return NextResponse.json(
      {
        error: {
          code: typed.code ?? "caption.failed",
          message: typed.message,
          requestId: crypto.randomUUID(),
        },
      },
      { status: typed.httpStatus ?? 400 },
    );
  }
}
