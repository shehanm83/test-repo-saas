import { NextResponse } from "next/server";

import { GenerationEstimateApi } from "@vyora/api";
import { loadConfig } from "@vyora/shared/config";
import { AppError } from "@vyora/shared/errors/app-error";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  try {
    const api = new GenerationEstimateApi(loadConfig(), createServerAdapters() as never);
    const payload = await api.estimate({
      workspaceId: session.workspaceId,
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
          code: typed.code ?? "generation.estimate_failed",
          message: typed.message,
          requestId: crypto.randomUUID(),
        },
      },
      { status: typed.httpStatus ?? 400 },
    );
  }
}
