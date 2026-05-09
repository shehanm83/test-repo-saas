import { NextResponse } from "next/server";

import { RecomposeService } from "@vyora/api";
import { loadConfig } from "@vyora/shared/config";
import { AppError } from "@vyora/shared/errors/app-error";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; vid: string }> },
) {
  const { session } = await getSessionWorkspace();
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

  const { id, vid } = await context.params;
  const config = loadConfig();
  const adapters = createServerAdapters();
  const service = new RecomposeService(config, adapters.storage);

  try {
    const payload = await service.recomposeVariant({
      workspaceId: session.workspaceId,
      generationId: id,
      variantId: vid,
      input: await request.json(),
    });
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: e.code,
            message: e.userMessage,
            details: e.details,
            requestId: crypto.randomUUID(),
          },
        },
        { status: e.httpStatus },
      );
    }
    const typed = e as Error & { code?: string; httpStatus?: number };
    return NextResponse.json(
      {
        error: {
          code: typed.code ?? "recompose.failed",
          message: typed.message,
          requestId: crypto.randomUUID(),
        },
      },
      { status: typed.httpStatus ?? 500 },
    );
  }
}
