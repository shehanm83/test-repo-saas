import { and, asc, eq, sql } from "drizzle-orm";

import type { Db } from "../client";
import { templates } from "../schema";

export async function adminListTemplates(db: Db) {
  return db.select().from(templates).orderBy(asc(templates.name));
}

export async function adminCreateTemplate(db: Db, value: typeof templates.$inferInsert) {
  const [template] = await db.insert(templates).values(value).returning();
  return template!;
}

export async function adminUpdateTemplate(
  db: Db,
  id: string,
  patch: Partial<typeof templates.$inferInsert>,
) {
  const [template] = await db
    .update(templates)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(templates.id, id))
    .returning();
  return template ?? null;
}

export async function listPublishedTemplatesForRouting(
  db: Db,
  aspectRatio: string,
  preferredModel?: string,
) {
  const conditions = [
    eq(templates.status, "published"),
    sql`${aspectRatio} = ANY(${templates.supportedAspectRatios})`,
  ];

  if (preferredModel) {
    conditions.push(eq(templates.preferredModel, preferredModel));
  }

  return db
    .select()
    .from(templates)
    .where(and(...conditions))
    .orderBy(asc(templates.name));
}
