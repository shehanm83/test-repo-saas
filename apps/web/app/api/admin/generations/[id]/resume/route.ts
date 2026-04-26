import { NextResponse } from "next/server";

import { createDb, generations, generationVariants } from "@studio/db";
import { eq } from "drizzle-orm";
import { loadConfig, createAdapters } from "@studio/shared";

import { getServerSession } from "@/lib/auth/server";
import { writeAdminAudit } from "@/lib/server/admin";

export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await props.params;
  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  const [generation] = await db.select().from(generations).where(eq(generations.id, id)).limit(1);
  if (!generation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const failedVariants = await db
    .select()
    .from(generationVariants)
    .where(eq(generationVariants.generationId, id));

  const toResume = failedVariants.filter((v) => v.status === "failed" || v.status === "failed_safety");

  if (toResume.length === 0) {
    return NextResponse.json({ resumed: 0, message: "No failed variants to resume" });
  }

  const adapters = createAdapters(config);
  let resumed = 0;

  for (const variant of toResume) {
    await db
      .update(generationVariants)
      .set({ status: "queued", errorPayload: null })
      .where(eq(generationVariants.id, variant.id));

    await adapters.queue.send(config.queue.generationsQueue, {
      generationId: id,
      variantId: variant.id,
      workspaceId: generation.workspaceId,
    });

    resumed++;
  }

  await writeAdminAudit({
    workspaceId: generation.workspaceId,
    actorUserId: session.userId,
    action: "generation.resume",
    target: id,
    payload: { resumed, variantIds: toResume.map((v) => v.id) },
  });

  return NextResponse.json({ resumed });
}
