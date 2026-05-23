import { NextResponse } from "next/server";

import { GenerationApi, assertGenerationCapacity, rateLimit } from "@layertone/api";
import { createDb } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";
import { AppError } from "@layertone/shared/errors/app-error";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

const RATE_LIMITS_BY_PLAN: Record<string, number> = {
  free: 10,
  starter: 30,
  pro: 60,
  business: 120,
  agency: 240,
};

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; vid: string }> },
) {
  const { session, workspace } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json(
      {
        error: {
          code: "auth.no_workspace",
          message: "No active workspace.",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 400 },
    );
  }

  const params = await context.params;
  const config = loadConfig();
  const adminDb = createDb(config.db.url, "app_admin");
  const planCode = workspace?.planCode ?? "free";

  try {
    await rateLimit(
      adminDb,
      `gen:user:${session.userId}`,
      RATE_LIMITS_BY_PLAN[planCode] ?? 10,
      60,
    );
    await assertGenerationCapacity(adminDb, session.workspaceId, planCode);

    const api = new GenerationApi(config, createServerAdapters() as never);
    const payload = await api.regenerateVariant({
      workspaceId: session.workspaceId,
      userId: session.userId,
      generationId: params.id,
      variantId: params.vid,
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
          code: typed.code ?? "generation.failed",
          message: typed.message,
          requestId: crypto.randomUUID(),
        },
      },
      { status: typed.httpStatus ?? 400 },
    );
  }
}
