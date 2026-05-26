import { NextResponse } from "next/server";

import { billingSegmentFor } from "@layertone/billing";
import { createDb, createProjectFromGeneration } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const { session, workspace } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }
  if (billingSegmentFor(workspace?.planCode) === "free") {
    return NextResponse.json(
      { error: "saved-projects-unavailable-on-free" },
      { status: 403 },
    );
  }

  const input = (await request.json().catch(() => null)) as { generationId?: unknown } | null;
  const generationId = typeof input?.generationId === "string" ? input.generationId.trim() : "";
  if (!UUID_RE.test(generationId)) {
    return NextResponse.json({ error: "invalid-generation-id" }, { status: 400 });
  }

  const db = createDb(loadConfig().db.url, "app_user");
  const result = await createProjectFromGeneration(
    db,
    session.workspaceId,
    generationId,
  );

  if (!result) {
    return NextResponse.json({ error: "generation-not-found" }, { status: 404 });
  }

  return NextResponse.json({
    projectId: result.project.id,
    created: result.created,
  });
}
