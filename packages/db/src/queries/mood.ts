import { and, asc, eq, sql } from "drizzle-orm";

import type { Db } from "../client";
import { moods, moodTemplateBindings, templates } from "../schema";

export const ASPECT_RATIO_VALUES = ["1:1", "4:5", "9:16", "16:9", "1.91:1", "2:3"] as const;
export type AspectRatio = (typeof ASPECT_RATIO_VALUES)[number];

export async function listAvailableMoods(
  db: Db,
  args: { aspectRatio?: AspectRatio; now?: Date } = {},
) {
  const conditions = [eq(moods.status, "published")];

  if (args.aspectRatio) {
    conditions.push(sql`${args.aspectRatio} = ANY(${moods.supportedAspectRatios})`);
  }

  return db
    .select()
    .from(moods)
    .where(and(...conditions))
    .orderBy(asc(moods.name));
}

export async function adminListMoods(db: Db) {
  return db.select().from(moods).orderBy(asc(moods.name));
}

export async function adminCreateMood(db: Db, value: typeof moods.$inferInsert) {
  const [mood] = await db.insert(moods).values(value).returning();
  return mood!;
}

export async function adminUpdateMood(
  db: Db,
  id: string,
  patch: Partial<typeof moods.$inferInsert>,
) {
  const [mood] = await db
    .update(moods)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(moods.id, id))
    .returning();
  return mood ?? null;
}

export async function adminDeleteMood(db: Db, id: string) {
  await db.delete(moods).where(eq(moods.id, id));
}

export async function adminBindings(db: Db, moodId: string) {
  return db
    .select({
      id: moodTemplateBindings.id,
      templateId: templates.id,
      slug: templates.slug,
      name: templates.name,
      weight: moodTemplateBindings.weight,
    })
    .from(moodTemplateBindings)
    .innerJoin(templates, eq(templates.id, moodTemplateBindings.templateId))
    .where(eq(moodTemplateBindings.moodId, moodId))
    .orderBy(asc(moodTemplateBindings.weight), asc(templates.name));
}

export async function setBindings(
  db: Db,
  moodId: string,
  items: Array<{ templateId: string; weight: number }>,
) {
  return db.transaction(async (tx) => {
    await tx.delete(moodTemplateBindings).where(eq(moodTemplateBindings.moodId, moodId));
    if (items.length > 0) {
      await tx.insert(moodTemplateBindings).values(
        items.map((item) => ({
          moodId,
          templateId: item.templateId,
          weight: item.weight,
        })),
      );
    }
  });
}
