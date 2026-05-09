import { NextResponse } from "next/server";

import { ProductApi } from "@vyora/api/product";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

type AssetKind =
  | "product"
  | "packaging"
  | "lifestyle"
  | "label_detail"
  | "before"
  | "after"
  | "cutout";

type UploadAssetArgs = {
  kind: AssetKind;
  file: { bytes: Buffer; filename: string };
  productVariantId?: string | null;
  backgroundRemoved?: boolean;
  labelVisibility?: "unknown" | "low" | "medium" | "high";
};

function parseBool(value: FormDataEntryValue | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
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
  const kind = formData.get("kind");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }
  if (typeof kind !== "string") {
    return NextResponse.json({ error: "missing-kind" }, { status: 400 });
  }

  const api = new ProductApi(loadConfig(), createServerAdapters() as never);
  const uploadArgs: UploadAssetArgs = {
    kind: kind as AssetKind,
    productVariantId:
      typeof formData.get("productVariantId") === "string"
        ? (formData.get("productVariantId") as string)
        : null,
    file: {
      bytes: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    },
  };
  const backgroundRemoved = parseBool(formData.get("backgroundRemoved"));
  if (backgroundRemoved !== undefined) uploadArgs.backgroundRemoved = backgroundRemoved;
  if (typeof formData.get("labelVisibility") === "string") {
    uploadArgs.labelVisibility = formData.get("labelVisibility") as
      | "unknown"
      | "low"
      | "medium"
      | "high";
  }

  const payload = await api.uploadAsset(session.workspaceId, id, uploadArgs);
  return NextResponse.json(payload);
}
