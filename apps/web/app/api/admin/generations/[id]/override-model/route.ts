import { NextResponse } from "next/server";

import { createDb, generations, generationVariants, templates } from "@studio/db";
import { eq, inArray } from "drizzle-orm";
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

  const candidateVariants = body.variantId
    ? await db
        .select()
        .from(generationVariants)
        .where(eq(generationVariants.id, body.variantId))
    : await db
        .select()
        .from(generationVariants)
        .where(eq(generationVariants.generationId, id));

  const variantsToOverride = candidateVariants.filter((v) =>
    v.status === "failed" || v.status === "failed_safety" || v.status === "queued",
  );

  const adapters = createAdapters(config);
  const overridden = variantsToOverride.length;

  if (overridden > 0) {
    const variantIds = variantsToOverride.map((v) => v.id);

    await db
      .update(generationVariants)
      .set({ templateId: body.fallbackTemplateId, status: "queued", errorPayload: null })
      .where(inArray(generationVariants.id, variantIds));

    await Promise.all(
      variantsToOverride.map((variant) =>
        adapters.queue.send(config.queue.generationsQueue, {
          generationId: id,
          variantId: variant.id,
          workspaceId: generation.workspaceId,
        }),
      ),
    );
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
