import { NextResponse } from "next/server";

import { GenerationApi } from "@vyora/api/generation";
import { createDb, getGenerationFingerprint } from "@vyora/db";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  // Audit fix #3: ETag-based short-circuit. The result page polls this every
  // 1.5s; during the 30-60s render window most polls return identical
  // payloads. Computing a cheap fingerprint first lets us 304 those without
  // signing 8 S3 URLs and serialising the full payload.
  const config = loadConfig();
  const adminDb = createDb(config.db.url, "app_admin");
  const fp = await getGenerationFingerprint(adminDb, session.workspaceId, id);
  if (!fp) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const etag = `W/"${fp.status}.${fp.completedVariants}.${fp.variantCount}.${Math.floor(fp.updatedAt)}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const api = new GenerationApi(config, createServerAdapters() as never);
  const payload = await api.get({ workspaceId: session.workspaceId, generationId: id });
  return NextResponse.json(payload, {
    headers: { ETag: etag, "Cache-Control": "private, no-cache" },
  });
}
