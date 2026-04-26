import { NextResponse } from "next/server";

import { rateLimit, InspirationUploadApi } from "@studio/api";
import { createDb } from "@studio/db";
import { AppError, loadConfig } from "@studio/shared";

import { getSessionWorkspace } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

export async function POST(request: Request) {
  const { session } = await getSessionWorkspace();
  if (!session.workspaceId) {
    return NextResponse.json({ error: "no-workspace" }, { status: 400 });
  }

  const config = loadConfig();
  const adminDb = createDb(config.db.url, "app_admin");

  try {
    await rateLimit(adminDb, `upload:user:${session.userId}`, 10, 60);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing-file" }, { status: 400 });
    }

    const api = new InspirationUploadApi(config, createServerAdapters() as never);
    const payload = await api.create({
      workspaceId: session.workspaceId,
      userId: session.userId,
      file: {
        bytes: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
      },
    });

    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.userMessage, requestId: crypto.randomUUID() } },
        { status: e.httpStatus },
      );
    }
    throw e;
  }
}
