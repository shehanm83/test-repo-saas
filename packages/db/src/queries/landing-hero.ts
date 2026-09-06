import { asc, eq, inArray } from "drizzle-orm";

import type { Db } from "../client";
import { landingHeroCards, landingHeroSetCards, landingHeroSets } from "../schema";

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

export async function insertLandingHeroCard(db: Db, value: typeof landingHeroCards.$inferInsert) {
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

export async function listLandingHeroSetsAll(db: Db) {
  return db
    .select()
    .from(landingHeroSets)
    .orderBy(asc(landingHeroSets.status), asc(landingHeroSets.createdAt));
}

export async function listLandingHeroSetsPublished(db: Db) {
  return db
    .select()
    .from(landingHeroSets)
    .where(eq(landingHeroSets.status, "published"))
    .orderBy(asc(landingHeroSets.createdAt));
}

export async function getLandingHeroSet(db: Db, id: string) {
  const [row] = await db.select().from(landingHeroSets).where(eq(landingHeroSets.id, id));
  return row ?? null;
}

export async function listLandingHeroSetCardsBySetIds(db: Db, setIds: string[]) {
  if (setIds.length === 0) return [];
  return db
    .select()
    .from(landingHeroSetCards)
    .where(inArray(landingHeroSetCards.setId, setIds))
    .orderBy(asc(landingHeroSetCards.slot));
}

export async function insertLandingHeroSet(db: Db, value: typeof landingHeroSets.$inferInsert) {
  const [row] = await db.insert(landingHeroSets).values(value).returning();
  return row!;
}

export async function updateLandingHeroSet(
  db: Db,
  id: string,
  patch: Partial<typeof landingHeroSets.$inferInsert>,
) {
  const [row] = await db
    .update(landingHeroSets)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(landingHeroSets.id, id))
    .returning();
  return row ?? null;
}

export async function deleteLandingHeroSet(db: Db, id: string) {
  await db.delete(landingHeroSets).where(eq(landingHeroSets.id, id));
}

export async function upsertLandingHeroSetCard(
  db: Db,
  value: typeof landingHeroSetCards.$inferInsert,
) {
  const [row] = await db
    .insert(landingHeroSetCards)
    .values(value)
    .onConflictDoUpdate({
      target: [landingHeroSetCards.setId, landingHeroSetCards.slot],
      set: {
        ...value,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row!;
}
