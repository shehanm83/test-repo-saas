import { NextResponse } from "next/server";

import { InspirationUploadApi } from "@studio/api/inspiration";
import { loadConfig } from "@studio/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }

  const api = new InspirationUploadApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.create({
    workspaceId: session.workspaceId,
    userId: session.userId,
    file: {
      bytes: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    },
  });

  return NextResponse.json(payload);
}
