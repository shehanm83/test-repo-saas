import { NextResponse } from "next/server";

import { BrandApi } from "@vyora/api/brand";
import { loadConfig } from "@vyora/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

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

  const api = new BrandApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.uploadReference(session.workspaceId, id, {
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    filename: file.name,
  });
  return NextResponse.json(payload);
}
