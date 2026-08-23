import { and, eq, sql } from "drizzle-orm";

import type { Db } from "../client";
import { generations, generationVariants, moodTemplateBindings, templates } from "../schema";
import { withWorkspace } from "../with-workspace";

export async function pickTemplates(
  db: Db,
  args: {
    moodId: string | null;
    aspectRatio: string;
    n: number;
    preferredSlug?: string;
    templateId?: string;
    family?: string;
    layout?: string;
    requiredSlots?: string[];
    rendererCompatibility?: "satori" | "browser";
  },
) {
  const templateConditions = [
    eq(templates.status, "published"),
    sql`${args.aspectRatio} = ANY(${templates.supportedAspectRatios})`,
    ...(args.templateId ? [eq(templates.id, args.templateId)] : []),
    ...(args.family ? [eq(templates.family, args.family)] : []),
    ...(args.layout ? [eq(templates.layout, args.layout)] : []),
    ...(args.rendererCompatibility
      ? [eq(templates.rendererCompatibility, args.rendererCompatibility)]
      : []),
    ...(args.requiredSlots?.length
      ? [
          sql`${templates.slots} ?& ARRAY[${sql.join(
            args.requiredSlots.map((slot) => sql`${slot}`),
            sql`, `,
          )}]::text[]`,
        ]
      : []),
  ];

  if (args.moodId) {
    return db
      .select({
        tid: moodTemplateBindings.templateId,
        weight: moodTemplateBindings.weight,
        slug: templates.slug,
        preferredModel: templates.preferredModel,
        requiresBrowserRender: templates.requiresBrowserRender,
      })
      .from(moodTemplateBindings)
      .innerJoin(templates, eq(templates.id, moodTemplateBindings.templateId))
      .where(and(eq(moodTemplateBindings.moodId, args.moodId), ...templateConditions))
      .orderBy(sql`${moodTemplateBindings.weight} DESC`)
      .limit(args.n);
  }

  // Brand-only fallback: published templates supporting this aspect ratio
  return db
    .select({
      tid: templates.id,
      weight: sql<number>`100`,
      slug: templates.slug,
      preferredModel: templates.preferredModel,
      requiresBrowserRender: templates.requiresBrowserRender,
    })
    .from(templates)
    .where(and(...templateConditions))
    .orderBy(
      args.preferredSlug
        ? sql`CASE WHEN ${templates.slug} = ${args.preferredSlug} THEN 0 ELSE 1 END`
        : sql`${templates.createdAt} ASC`,
    )
    .limit(args.n);
}

export async function insertGeneration(
  db: Db,
  workspaceId: string,
  v: typeof generations.$inferInsert,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [g] = await tx.insert(generations).values(v).returning();
    return g!;
  });
}

export async function insertVariants(
  db: Db,
  workspaceId: string,
  rows: (typeof generationVariants.$inferInsert)[],
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    return tx.insert(generationVariants).values(rows).returning();
  });
}

export async function updateGenerationInspirationKey(db: Db, generationId: string, s3Key: string) {
  await db
    .update(generations)
    .set({ inspirationImageS3Key: s3Key })
    .where(eq(generations.id, generationId));
}

export async function getGenerationFull(db: Db, workspaceId: string, generationId: string) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [g] = await tx.select().from(generations).where(eq(generations.id, generationId));
    if (!g) return null;
    const variants = await tx
      .select()
      .from(generationVariants)
      .where(eq(generationVariants.generationId, generationId));
    return { ...g, variants };
  });
}
