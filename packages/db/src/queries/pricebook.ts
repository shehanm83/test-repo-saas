import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";

import type { Db } from "../client";
import { priceBookEntries } from "../schema";

export async function adminListPricebook(db: Db) {
  return db
    .select()
    .from(priceBookEntries)
    .orderBy(desc(priceBookEntries.version), asc(priceBookEntries.modelCode));
}

export async function adminInsertPricebookEntry(
  db: Db,
  value: typeof priceBookEntries.$inferInsert,
) {
  const [entry] = await db.insert(priceBookEntries).values(value).returning();
  return entry!;
}

export async function priceBookLookup(
  db: Db,
  args: {
    modelCode: string;
    sizeBucket: "standard" | "large";
    premiumFlag: boolean;
    hasInspirationFlag: boolean;
    at?: Date;
  },
) {
  const at = args.at ?? new Date();
  const [entry] = await db
    .select()
    .from(priceBookEntries)
    .where(
      and(
        eq(priceBookEntries.modelCode, args.modelCode),
        eq(priceBookEntries.sizeBucket, args.sizeBucket),
        eq(priceBookEntries.premiumFlag, args.premiumFlag),
        eq(priceBookEntries.hasInspirationFlag, args.hasInspirationFlag),
        lte(priceBookEntries.effectiveFrom, at),
        or(isNull(priceBookEntries.effectiveTo), gt(priceBookEntries.effectiveTo, at)),
      ),
    )
    .orderBy(desc(priceBookEntries.version))
    .limit(1);

  if (!entry) {
    throw new Error(
      `pricebook-not-found:${args.modelCode}/${args.sizeBucket}/${args.premiumFlag}/${args.hasInspirationFlag}`,
    );
  }

  return entry;
}

export async function expirePricebookVersion(db: Db, id: string, expireAt: Date) {
  await db
    .update(priceBookEntries)
    .set({ effectiveTo: expireAt })
    .where(eq(priceBookEntries.id, id));
}
