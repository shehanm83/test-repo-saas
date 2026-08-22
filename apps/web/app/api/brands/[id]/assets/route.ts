import { NextResponse } from "next/server";

import { BrandApi } from "@layertone/api/brand";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";
import { apiError } from "@/lib/server/api-error";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const adapters = createServerAdapters();
  const api = new BrandApi(loadConfig(), adapters as never);
  const assets = await api.assets(session.workspaceId, id);
  const payload = await Promise.all(
    assets.map(async (asset) => ({
      id: asset.id,
      kind: asset.kind,
      variant: asset.variant,
      background: asset.background,
      label: asset.label,
      isPrimary: asset.isPrimary,
      s3Key: asset.s3Key,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      url: await adapters.storage.getSignedUrl(asset.s3Key, 60 * 60).catch(() => null),
    })),
  );
  return NextResponse.json(payload);
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }

  const adapters = createServerAdapters();
  const api = new BrandApi(loadConfig(), adapters as never);
  try {
    const payload = await api.uploadReference(session.workspaceId, id, {
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      filename: file.name,
    });
    const s3Key = (payload as { s3Key?: string }).s3Key;
    return NextResponse.json({
      ...payload,
      url: s3Key ? await adapters.storage.getSignedUrl(s3Key, 60 * 60).catch(() => null) : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
