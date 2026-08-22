import { NextResponse } from "next/server";

import { BrandApi } from "@layertone/api/brand";
import { loadConfig } from "@layertone/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";
import { apiError } from "@/lib/server/api-error";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string; assetId: string }> },
) {
  const { id, assetId } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const api = new BrandApi(loadConfig(), createServerAdapters() as never);
  try {
    const asset = await api.updateAsset(session.workspaceId, id, assetId, await request.json());
    if (!asset) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }
    return NextResponse.json(asset);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; assetId: string }> },
) {
  const { id, assetId } = await props.params;
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  // Goes through BrandApi rather than deleting the row directly: the API also
  // repoints brands.logo_s3_key when the deleted asset was the one it named.
  const api = new BrandApi(loadConfig(), createServerAdapters() as never);
  try {
    const deleted = await api.deleteAsset(session.workspaceId, id, assetId);
    if (!deleted) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
