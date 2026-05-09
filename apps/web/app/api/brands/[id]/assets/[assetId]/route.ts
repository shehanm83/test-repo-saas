import { NextResponse } from "next/server";

import { and, brandAssets, createDb, eq } from "@vyora/db";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; assetId: string }> },
) {
  const { id, assetId } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const config = loadConfig();
  const db = createDb(config.db.url, "app_user");
  const [payload] = await db
    .delete(brandAssets)
    .where(
      and(
        eq(brandAssets.id, assetId),
        eq(brandAssets.brandId, id),
        eq(brandAssets.workspaceId, session.workspaceId),
      ),
    )
    .returning();
  if (!payload) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  await createServerAdapters().storage.delete(payload.s3Key).catch(() => undefined);
  return NextResponse.json({ deleted: true });
}
