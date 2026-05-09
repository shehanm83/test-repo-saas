import { NextResponse } from "next/server";

import { StockApi } from "@vyora/api/stock";
import { loadConfig } from "@vyora/shared/config";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";
import { writeAdminAudit } from "@/lib/server/admin";

export async function GET() {
  const payload = await new StockApi(loadConfig(), createServerAdapters() as never).adminList();
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }

  const api = new StockApi(loadConfig(), createServerAdapters() as never);
  const payload = await api.adminUpload({
    kind: (formData.get("kind") as "icon" | "photo") ?? "photo",
    tags: JSON.parse((formData.get("tags") as string) ?? "[]") as string[],
    license: (formData.get("license") as string) ?? "internal",
    file: {
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      filename: file.name,
    },
  });
  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.stock.upload",
      target: payload.id,
      payload: { kind: payload.kind, tags: payload.tags },
    });
  }
  return NextResponse.json(payload);
}
