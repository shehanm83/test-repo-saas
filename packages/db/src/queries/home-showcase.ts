import { asc, eq } from "drizzle-orm";

import type { Db } from "../client";
import { homeShowcaseConfig, homeShowcaseImages } from "../schema";

const SINGLETON_ID = "singleton";

export async function getHomeShowcaseConfig(db: Db) {
  const [row] = await db
    .select()
    .from(homeShowcaseConfig)
    .where(eq(homeShowcaseConfig.id, SINGLETON_ID));
  return row ?? null;
}

export async function upsertHomeShowcaseConfig(
  db: Db,
  config: typeof homeShowcaseConfig.$inferInsert.config,
) {
  const [row] = await db
    .insert(homeShowcaseConfig)
    .values({ id: SINGLETON_ID, config })
    .onConflictDoUpdate({
      target: homeShowcaseConfig.id,
      set: { config, updatedAt: new Date() },
    })
    .returning();
  return row!;
}

export async function listHomeShowcaseImages(db: Db) {
  return db
    .select()
    .from(homeShowcaseImages)
    .orderBy(asc(homeShowcaseImages.sortOrder), asc(homeShowcaseImages.createdAt));
}

export async function insertHomeShowcaseImage(
  db: Db,
  value: typeof homeShowcaseImages.$inferInsert,
) {
  const [row] = await db.insert(homeShowcaseImages).values(value).returning();
  return row!;
}

export async function upsertHomeShowcaseImage(
  db: Db,
  value: typeof homeShowcaseImages.$inferInsert,
) {
  const [row] = await db
    .insert(homeShowcaseImages)
    .values(value)
    .onConflictDoUpdate({
      target: homeShowcaseImages.id,
      set: {
        s3Key: value.s3Key,
        sortOrder: value.sortOrder,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row!;
}

export async function updateHomeShowcaseImage(
  db: Db,
  id: string,
  patch: Partial<typeof homeShowcaseImages.$inferInsert>,
) {
  const [row] = await db
    .update(homeShowcaseImages)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(homeShowcaseImages.id, id))
    .returning();
  return row ?? null;
}

export async function deleteHomeShowcaseImage(db: Db, id: string) {
  await db.delete(homeShowcaseImages).where(eq(homeShowcaseImages.id, id));
}
