import { NextResponse } from "next/server";

import { adminUpdateMood, createDb } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";
import { keys } from "@layertone/storage";

import { requireSession } from "@/lib/auth/server";
import { createServerAdapters } from "@/lib/server/adapters";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await props.params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "invalid-type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file-too-large" }, { status: 400 });
  }

  const config = loadConfig();
  const { storage } = createServerAdapters();
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const s3Key = keys.globalMoodPreview(id).replace(".png", `.${ext}`);

  await storage.putBytes(s3Key, bytes, file.type);

  const db = createDb(config.db.url, "app_admin");
  await adminUpdateMood(db, id, { previewS3Key: s3Key });

  const url = await storage.getSignedUrl(s3Key, 3600);
  return NextResponse.json({ url });
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await props.params;
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");
  await adminUpdateMood(db, id, { previewS3Key: null });
  return NextResponse.json({ ok: true });
}
