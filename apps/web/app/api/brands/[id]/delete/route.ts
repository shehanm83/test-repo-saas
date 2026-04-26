import { NextResponse } from "next/server";

import { brands, createDb } from "@studio/db";
import { and, eq } from "@studio/db/operators";
import { loadConfig } from "@studio/shared";

import { getSessionWorkspace } from "@/lib/auth/server";

export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const db = createDb(loadConfig().db.url, "app_admin");
  await db
    .delete(brands)
    .where(and(eq(brands.id, id), eq(brands.workspaceId, session.workspaceId)));

  return NextResponse.json({ ok: true });
}
