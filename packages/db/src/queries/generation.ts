import { and, eq, sql } from "drizzle-orm";

import type { Db } from "../client";
import {
  generations,
  generationVariants,
  moodTemplateBindings,
  templates,
} from "../schema";
import { withWorkspace } from "../with-workspace";

export async function pickTemplates(
  db: Db,
  args: { moodId: string | null; aspectRatio: string; n: number; preferredSlug?: string },
) {
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
      .where(
        and(
          eq(moodTemplateBindings.moodId, args.moodId),
          eq(templates.status, "published"),
          sql`${args.aspectRatio} = ANY(${templates.supportedAspectRatios})`,
        ),
      )
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
    .where(
      and(
        eq(templates.status, "published"),
        sql`${args.aspectRatio} = ANY(${templates.supportedAspectRatios})`,
      ),
    )
    .orderBy(args.preferredSlug
      ? sql`CASE WHEN ${templates.slug} = ${args.preferredSlug} THEN 0 ELSE 1 END`
      : sql`${templates.createdAt} ASC`)
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

export async function updateGenerationInspirationKey(
  db: Db,
  generationId: string,
  s3Key: string,
) {
  await db.update(generations).set({ inspirationImageS3Key: s3Key }).where(eq(generations.id, generationId));
}

export async function getGenerationFull(
  db: Db,
  workspaceId: string,
  generationId: string,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [g] = await tx
      .select()
      .from(generations)
      .where(eq(generations.id, generationId));
    if (!g) return null;
    const variants = await tx
      .select()
      .from(generationVariants)
      .where(eq(generationVariants.generationId, generationId));
    return { ...g, variants };
  });
}

// Audit fix #3: cheap fingerprint for ETag support on /api/generations/[id].
// Returns just the timestamps + counts that change as variants progress, so
// the route can short-circuit polling traffic with a 304 when nothing has
// moved. Skipping the full SELECT-with-variants saves ~1KB per row of
// JSON parsing + 4×2 storage.getSignedUrl calls per response.
export async function getGenerationFingerprint(
  db: Db,
  workspaceId: string,
  generationId: string,
): Promise<{
  status: string;
  updatedAt: number;
  variantCount: number;
  completedVariants: number;
} | null> {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [row] = await tx.execute<{
      status: string;
      gen_ts: string | null;
      variant_count: string;
      completed_count: string;
      max_variant_ts: string | null;
    }>(sql`
      SELECT
        g.status,
        EXTRACT(EPOCH FROM COALESCE(g.completed_at, g.created_at))::text AS gen_ts,
        COUNT(v.id)::text                                                AS variant_count,
        COUNT(v.id) FILTER (WHERE v.status = 'completed')::text          AS completed_count,
        EXTRACT(EPOCH FROM MAX(COALESCE(v.completed_at, v.created_at)))::text AS max_variant_ts
      FROM generations g
      LEFT JOIN generation_variants v ON v.generation_id = g.id
      WHERE g.id = ${generationId}
      GROUP BY g.id
    `);
    if (!row) return null;
    const genTs = row.gen_ts ? parseFloat(row.gen_ts) : 0;
    const varTs = row.max_variant_ts ? parseFloat(row.max_variant_ts) : 0;
    return {
      status: row.status,
      updatedAt: Math.max(genTs, varTs),
      variantCount: parseInt(row.variant_count, 10),
      completedVariants: parseInt(row.completed_count, 10),
    };
  });
}

// Variant + its parent generation's workspace (so the recompose handler can
// authorise against the session) and the background_s3_key needed to re-run
// Sharp. Returns null if the generation/variant don't exist.
export async function getVariantWithBackground(
  db: Db,
  generationId: string,
  variantId: string,
) {
  const [row] = await db
    .select({
      id: generationVariants.id,
      generationId: generationVariants.generationId,
      workspaceId: generations.workspaceId,
      status: generationVariants.status,
      outputS3Key: generationVariants.outputS3Key,
      backgroundS3Key: generationVariants.backgroundS3Key,
      cropRegion: generationVariants.cropRegion,
      recomposedAt: generationVariants.recomposedAt,
    })
    .from(generationVariants)
    .innerJoin(generations, eq(generations.id, generationVariants.generationId))
    .where(
      and(
        eq(generationVariants.id, variantId),
        eq(generationVariants.generationId, generationId),
      ),
    )
    .limit(1);
  return row ?? null;
}
