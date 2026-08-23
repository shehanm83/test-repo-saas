import { NextResponse } from "next/server";

import { createDb, saveGenerationVariantFeedback } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";

const RATINGS = new Set(["up", "down"] as const);
const REASONS = new Set([
  "wrong_product",
  "not_my_idea",
  "bad_composition",
  "brand_mismatch",
  "text_problem",
  "other",
] as const);

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; vid: string }> },
) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }
  const { vid } = await context.params;
  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const rating = typeof input?.rating === "string" && RATINGS.has(input.rating as never)
    ? (input.rating as "up" | "down")
    : null;
  const reason = typeof input?.reason === "string" && REASONS.has(input.reason as never)
    ? (input.reason as "wrong_product" | "not_my_idea" | "bad_composition" | "brand_mismatch" | "text_problem" | "other")
    : null;
  const note = typeof input?.note === "string" ? input.note.trim().slice(0, 500) : null;
  if (!rating || (rating === "down" && !reason)) {
    return NextResponse.json({ error: "Choose a rejection reason." }, { status: 422 });
  }
  const feedback = await saveGenerationVariantFeedback(
    createDb(loadConfig().db.url, "app_user"),
    {
      workspaceId: session.workspaceId,
      userId: session.userId,
      variantId: vid,
      rating,
      reason,
      note,
    },
  );
  if (!feedback) return NextResponse.json({ error: "variant-not-found" }, { status: 404 });
  return NextResponse.json({
    rating: feedback.rating,
    reason: feedback.reason,
    note: feedback.note,
  });
}
