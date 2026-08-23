import { NextResponse } from "next/server";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

const EVENTS = new Set([
  "generate_requested",
  "directions_planned",
  "prompt_preview_opened",
  "generation_started",
  "generation_failed",
  "upload_started",
  "upload_completed",
  "upload_failed",
  "result_viewed",
  "result_downloaded",
  "result_accepted",
  "refinement_started",
  "result_rejected",
  "text_edit_opened",
]);

const TAG_KEYS = new Set([
  "stage",
  "format",
  "quality",
  "variants",
  "has_product",
  "has_brand",
  "has_mood",
  "source",
  "reason",
  "model",
  "mood_mode",
  "clarification",
]);

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    event?: unknown;
    tags?: unknown;
  } | null;
  if (!body || typeof body.event !== "string" || !EVENTS.has(body.event)) {
    return NextResponse.json({ error: "invalid-event" }, { status: 422 });
  }

  const tags: Record<string, string> = {};
  if (body.tags && typeof body.tags === "object" && !Array.isArray(body.tags)) {
    for (const [key, value] of Object.entries(body.tags).slice(0, 8)) {
      if (!TAG_KEYS.has(key) || typeof value !== "string") continue;
      tags[key] = value.slice(0, 80);
    }
  }

  createServerAdapters().telemetry.metric(`quick_create.${body.event}`, 1, tags);
  return new NextResponse(null, { status: 204 });
}
