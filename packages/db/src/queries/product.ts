import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";

import type { Db } from "../client";
import { productAssets, productLines, products, productVariants } from "../schema";
import { withWorkspace } from "../with-workspace";

type Status = "draft" | "active" | "archived";

export async function listProductLines(
  db: Db,
  workspaceId: string,
  args: { includeArchived?: boolean; brandId?: string } = {},
) {
  return withWorkspace(db, workspaceId, (tx) => {
    const clauses = [
      ...(args.includeArchived ? [] : [ne(productLines.status, "archived" as Status)]),
      ...(args.brandId ? [eq(productLines.brandId, args.brandId)] : []),
    ];
    return tx
      .select()
      .from(productLines)
      .where(clauses.length ? and(...clauses) : undefined)
      .orderBy(desc(productLines.updatedAt), desc(productLines.createdAt));
  });
}

export async function createProductLine(
  db: Db,
  workspaceId: string,
  input: typeof productLines.$inferInsert,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [row] = await tx.insert(productLines).values(input).returning();
    return row!;
  });
}

export async function updateProductLine(
  db: Db,
  workspaceId: string,
  productLineId: string,
  patch: Partial<typeof productLines.$inferInsert>,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [row] = await tx
      .update(productLines)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(productLines.id, productLineId))
      .returning();
    return row ?? null;
  });
}

export async function listProducts(
  db: Db,
  workspaceId: string,
  args: { includeArchived?: boolean; brandId?: string; productLineId?: string } = {},
) {
  return withWorkspace(db, workspaceId, (tx) => {
    const clauses = [
      ...(args.includeArchived ? [] : [ne(products.status, "archived" as Status)]),
      ...(args.brandId ? [eq(products.brandId, args.brandId)] : []),
      ...(args.productLineId ? [eq(products.productLineId, args.productLineId)] : []),
    ];
    return tx
      .select()
      .from(products)
      .where(clauses.length ? and(...clauses) : undefined)
      .orderBy(desc(products.updatedAt), desc(products.createdAt));
  });
}

export async function getProduct(db: Db, workspaceId: string, productId: string) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, productId));
    return product ?? null;
  });
}

export async function createProduct(
  db: Db,
  workspaceId: string,
  input: typeof products.$inferInsert,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [row] = await tx.insert(products).values(input).returning();
    return row!;
  });
}

export async function updateProduct(
  db: Db,
  workspaceId: string,
  productId: string,
  patch: Partial<typeof products.$inferInsert>,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [row] = await tx
      .update(products)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();
    return row ?? null;
  });
}

export async function listProductVariants(db: Db, workspaceId: string, productId: string) {
  return withWorkspace(db, workspaceId, (tx) =>
    tx
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), ne(productVariants.status, "archived")))
      .orderBy(desc(productVariants.updatedAt), desc(productVariants.createdAt)),
  );
}

export async function createProductVariant(
  db: Db,
  workspaceId: string,
  input: typeof productVariants.$inferInsert,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [row] = await tx.insert(productVariants).values(input).returning();
    return row!;
  });
}

export async function updateProductVariant(
  db: Db,
  workspaceId: string,
  variantId: string,
  patch: Partial<typeof productVariants.$inferInsert>,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [row] = await tx
      .update(productVariants)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(productVariants.id, variantId))
      .returning();
    return row ?? null;
  });
}

export async function addProductAsset(
  db: Db,
  workspaceId: string,
  input: typeof productAssets.$inferInsert,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [row] = await tx.insert(productAssets).values(input).returning();
    return row!;
  });
}

export async function listProductAssets(db: Db, workspaceId: string, productId: string) {
  return withWorkspace(db, workspaceId, (tx) =>
    tx
      .select()
      .from(productAssets)
      .where(
        and(
          eq(productAssets.productId, productId),
          inArray(productAssets.kind, ["cutout", "product", "packaging", "label_detail"]),
        ),
      )
      .orderBy(desc(productAssets.createdAt)),
  );
}

/** Identity-first ordering used when Quick Create snapshots a saved product. */
export async function listProductIdentityAssets(db: Db, workspaceId: string, productId: string) {
  return withWorkspace(db, workspaceId, (tx) =>
    tx
      .select()
      .from(productAssets)
      .where(eq(productAssets.productId, productId))
      .orderBy(
        sql`CASE ${productAssets.kind}
          WHEN 'cutout' THEN 0
          WHEN 'product' THEN 1
          WHEN 'packaging' THEN 2
          WHEN 'label_detail' THEN 3
          ELSE 4
        END`,
        desc(productAssets.qualityScore),
        desc(productAssets.createdAt),
      ),
  );
}
