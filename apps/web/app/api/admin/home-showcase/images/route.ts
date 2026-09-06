import { NextResponse } from "next/server";

import { HomeShowcaseApi } from "@layertone/api/home-showcase";
import { loadConfig } from "@layertone/shared/config";

import { getAdminSessionWorkspace } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";
import { createServerAdapters } from "@/lib/server/adapters";

const api = () => new HomeShowcaseApi(loadConfig(), createServerAdapters() as never);

export async function POST(request: Request) {
  const context = await getAdminSessionWorkspace();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { session } = context;
  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .concat(formData.getAll("file"))
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }

  let view = await api().getAdminView();
  for (const file of files) {
    view = await api().addImage({
      bytes: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    });
  }

  if (session.workspaceId) {
    await writeAdminAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      action: "admin.home_showcase.image_create",
      target: "singleton",
      payload: { count: files.length },
    });
  }
  return NextResponse.json(view);
}
