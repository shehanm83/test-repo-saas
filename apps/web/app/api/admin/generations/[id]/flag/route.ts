import { NextResponse } from "next/server";

import { createDb, generations } from "@vyora/db";
import { eq } from "drizzle-orm";
import { loadConfig } from "@vyora/shared/config";

import { getServerSession } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await props.params;
  const body = await request.json().catch(() => ({})) as { reason?: string };
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  const [generation] = await db.select().from(generations).where(eq(generations.id, id)).limit(1);
  if (!generation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeAdminAudit({
    workspaceId: generation.workspaceId,
    actorUserId: session.userId,
    action: "generation.aup_flagged",
    target: id,
    payload: { reason: body.reason ?? "manual flag", brief: generation.brief },
  });

  return NextResponse.json({ flagged: true });
}
