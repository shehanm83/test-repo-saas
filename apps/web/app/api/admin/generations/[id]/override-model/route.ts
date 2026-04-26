import { NextResponse } from "next/server";

import { createDb, generations, generationVariants, templates } from "@studio/db";
import { eq } from "drizzle-orm";
import { loadConfig, createAdapters } from "@studio/shared";

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
  const body = await request.json() as { variantId?: string; fallbackTemplateId: string };

  if (!body.fallbackTemplateId) {
    return NextResponse.json({ error: "fallbackTemplateId required" }, { status: 400 });
  }

  const config = loadConfig();
  const db = createDb(config.db.url, "app_admin");

  const [generation] = await db.select().from(generations).where(eq(generations.id, id)).limit(1);
  if (!generation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [fallbackTemplate] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, body.fallbackTemplateId))
    .limit(1);

  if (!fallbackTemplate) {
    return NextResponse.json({ error: "Fallback template not found" }, { status: 404 });
  }

  const variantsToOverride = body.variantId
    ? await db
        .select()
        .from(generationVariants)
        .where(eq(generationVariants.id, body.variantId))
    : await db
        .select()
        .from(generationVariants)
        .where(eq(generationVariants.generationId, id));

  const adapters = createAdapters(config);
  let overridden = 0;

  for (const variant of variantsToOverride) {
    await db
      .update(generationVariants)
      .set({ templateId: body.fallbackTemplateId, status: "queued", errorPayload: null })
      .where(eq(generationVariants.id, variant.id));

    await adapters.queue.send(config.queue.generationsQueue, {
      generationId: id,
      variantId: variant.id,
      workspaceId: generation.workspaceId,
    });

    overridden++;
  }

  await writeAdminAudit({
    workspaceId: generation.workspaceId,
    actorUserId: session.userId,
    action: "generation.override_model",
    target: id,
    payload: { fallbackTemplateId: body.fallbackTemplateId, overridden },
  });

  return NextResponse.json({ overridden });
}
