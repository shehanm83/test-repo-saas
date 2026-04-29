import { asc, eq } from "drizzle-orm";

import type { Db } from "../client";
import { landingHeroCards } from "../schema";

export async function listLandingHeroCardsAll(db: Db) {
  return db
    .select()
    .from(landingHeroCards)
    .orderBy(asc(landingHeroCards.sortOrder), asc(landingHeroCards.createdAt));
}

export async function listLandingHeroCardsPublished(db: Db) {
  return db
    .select()
    .from(landingHeroCards)
    .where(eq(landingHeroCards.status, "published"))
    .orderBy(asc(landingHeroCards.sortOrder), asc(landingHeroCards.createdAt));
}

export async function insertLandingHeroCard(
  db: Db,
  value: typeof landingHeroCards.$inferInsert,
) {
  const [row] = await db.insert(landingHeroCards).values(value).returning();
  return row!;
}

export async function updateLandingHeroCard(
  db: Db,
  id: string,
  patch: Partial<typeof landingHeroCards.$inferInsert>,
) {
  const [row] = await db
    .update(landingHeroCards)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(landingHeroCards.id, id))
    .returning();
  return row ?? null;
}

export async function deleteLandingHeroCard(db: Db, id: string) {
  await db.delete(landingHeroCards).where(eq(landingHeroCards.id, id));
}
