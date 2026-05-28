import { eq, sql } from "drizzle-orm";

import type { Db } from "../client";
import { stockAssets } from "../schema";

export async function adminInsertStock(db: Db, value: typeof stockAssets.$inferInsert) {
  const [stockAsset] = await db.insert(stockAssets).values(value).returning();
  return stockAsset!;
}

export async function adminListStock(db: Db) {
  return db.select().from(stockAssets);
}

export async function findStockByTags(db: Db, tags: string[], limit = 5) {
  if (tags.length === 0) {
    return [];
  }

  return db
    .select()
    .from(stockAssets)
    .where(sql`${stockAssets.tags} && ${tags}`)
    .limit(limit);
}

export async function findStockByEmbedding(db: Db, embedding: number[], limit = 5) {
  return db
    .select({
      id: stockAssets.id,
      s3Key: stockAssets.s3Key,
      kind: stockAssets.kind,
      tags: stockAssets.tags,
    })
    .from(stockAssets)
    .orderBy(sql`${stockAssets.embedding} <=> ${sql.raw(`'[${embedding.join(",")}]'`)}::vector`)
    .limit(limit);
}

export async function deleteStock(db: Db, id: string) {
  await db.delete(stockAssets).where(eq(stockAssets.id, id));
}

export async function adminUpdateStock(
  db: Db,
  id: string,
  patch: Partial<Pick<typeof stockAssets.$inferInsert, "label" | "category" | "tags">>,
) {
  const cols = {
    ...(patch.label !== undefined ? { label: patch.label } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
  };
  if (Object.keys(cols).length === 0) return null;
  const [updated] = await db
    .update(stockAssets)
    .set(cols)
    .where(eq(stockAssets.id, id))
    .returning();
  return updated ?? null;
}

export async function getStockById(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(stockAssets)
    .where(eq(stockAssets.id, id))
    .limit(1);
  return row ?? null;
}
