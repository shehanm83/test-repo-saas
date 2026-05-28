import { NextResponse } from "next/server";

import { StockApi } from "@layertone/api/stock";
import { loadConfig } from "@layertone/shared/config";

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

  const files = formData.getAll("files");
  const singleFile = formData.get("file");
  const fileList = files.length > 0 ? files : singleFile ? [singleFile] : [];

  if (fileList.length === 0) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }

  const category = formData.get("category") as string;
  const label = formData.get("label") as string;
  const tags = JSON.parse((formData.get("tags") as string) ?? "[]") as string[];
  const license = (formData.get("license") as string) ?? "internal";

  if (!category || !label) {
    return NextResponse.json({ error: "missing-category-or-label" }, { status: 400 });
  }

  const api = new StockApi(loadConfig(), createServerAdapters() as never);
  const results = [];

  for (const fileEntry of fileList) {
    if (!(fileEntry instanceof File)) continue;
    // Derive per-file label from filename when batch uploading
    const fileLabel =
      fileList.length === 1
        ? label
        : fileEntry.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

    const payload = await api.adminUpload({
      kind: "icon",
      category: category as never,
      label: fileLabel,
      tags,
      license,
      file: {
        bytes: Buffer.from(await fileEntry.arrayBuffer()),
        mimeType: fileEntry.type,
        filename: fileEntry.name,
      },
    });

    if (session.workspaceId) {
      await writeAdminAudit({
        workspaceId: session.workspaceId,
        actorUserId: session.userId,
        action: "admin.stock.upload",
        target: payload.id,
        payload: { category, label: fileLabel, tags },
      });
    }
    results.push(payload);
  }

  return NextResponse.json(results.length === 1 ? results[0] : results);
}
