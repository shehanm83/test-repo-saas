import { NextResponse } from "next/server";

import { GenerationApi, assertGenerationCapacity, rateLimit } from "@layertone/api";
import { createDb } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";
import { AppError } from "@layertone/shared/errors/app-error";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

const LOCKS = new Set(["product", "composition", "brand", "copy", "mood"] as const);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; vid: string }> },
) {
  const { session, workspace } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: { message: "No active workspace." } }, { status: 400 });
  }
  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const instruction = typeof input?.instruction === "string" ? input.instruction.trim() : "";
  const locks = Array.isArray(input?.locks)
    ? input.locks.filter(
        (lock): lock is "product" | "composition" | "brand" | "copy" | "mood" =>
          typeof lock === "string" && LOCKS.has(lock as never),
      )
    : [];
  const treatmentVariantId =
    typeof input?.treatmentVariantId === "string" ? input.treatmentVariantId : null;
  const moodId = typeof input?.moodId === "string" ? input.moodId : null;
  if (!instruction || instruction.length > 2000) {
    return NextResponse.json({ error: { message: "Describe a change in 2,000 characters or fewer." } }, { status: 422 });
  }

  const params = await context.params;
  const config = loadConfig();
  const adminDb = createDb(config.db.url, "app_admin");
  try {
    await rateLimit(adminDb, `refine:user:${session.userId}`, 30, 60);
    await assertGenerationCapacity(adminDb, session.workspaceId, workspace?.planCode ?? "free");
    const payload = await new GenerationApi(config, createServerAdapters() as never).regenerateVariant({
      workspaceId: session.workspaceId,
      userId: session.userId,
      generationId: params.id,
      variantId: params.vid,
      refinement: { instruction, locks, treatmentVariantId, moodId },
    });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.userMessage } },
        { status: error.httpStatus },
      );
    }
    const typed = error as Error & { httpStatus?: number };
    return NextResponse.json(
      { error: { message: typed.message || "Refinement failed." } },
      { status: typed.httpStatus ?? 400 },
    );
  }
}
