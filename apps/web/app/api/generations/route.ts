import { NextResponse } from "next/server";

import { GenerationApi } from "@studio/api/generation";
import { loadConfig } from "@studio/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new GenerationApi(loadConfig(), createServerAdapters() as never);

  try {
    const payload = await api.create({
      workspaceId: session.workspaceId,
      userId: session.userId,
      input: await request.json(),
    });
    return NextResponse.json(payload);
  } catch (error) {
    const typed = error as Error & { code?: string; httpStatus?: number };
    return NextResponse.json(
      {
        error: {
          code: typed.code ?? "generation.failed",
          message: typed.message,
        },
      },
      { status: typed.httpStatus ?? 400 },
    );
  }
}
