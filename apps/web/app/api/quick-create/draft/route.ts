import { NextResponse } from "next/server";

import {
  createDb,
  deleteQuickCreateDraft,
  getQuickCreateDraft,
  saveQuickCreateDraft,
} from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";

const MAX_DRAFT_BYTES = 96_000;

async function context() {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) return null;
  return {
    workspaceId: session.workspaceId,
    userId: session.userId,
    db: createDb(loadConfig().db.url, "app_user"),
  };
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  const draft = await getQuickCreateDraft(ctx.db, ctx.workspaceId, ctx.userId);
  return NextResponse.json(
    draft
      ? { version: draft.version, payload: draft.payload, updatedAt: draft.updatedAt }
      : { version: 1, payload: null, updatedAt: null },
  );
}

export async function PUT(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_DRAFT_BYTES) {
    return NextResponse.json({ error: "draft-too-large" }, { status: 413 });
  }
  const body = JSON.parse(raw || "null") as { version?: unknown; payload?: unknown } | null;
  if (!body || body.version !== 1 || !body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "invalid-draft" }, { status: 422 });
  }
  const draft = await saveQuickCreateDraft(ctx.db, {
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    version: 1,
    payload: body.payload,
  });
  return NextResponse.json({ saved: true, updatedAt: draft.updatedAt });
}

export async function DELETE() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  await deleteQuickCreateDraft(ctx.db, ctx.workspaceId, ctx.userId);
  return new NextResponse(null, { status: 204 });
}
