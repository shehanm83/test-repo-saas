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
