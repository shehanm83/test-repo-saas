import { and, desc, eq } from "drizzle-orm";

import type { Db } from "../client";
import { brandAssets, brands } from "../schema";
import { withWorkspace } from "../with-workspace";

export class BrandNameTakenError extends Error {
  readonly code = "brand_name_taken";
  readonly brandName: string;
  constructor(brandName: string) {
    super(`A brand named "${brandName}" already exists in this workspace.`);
    this.brandName = brandName;
  }
}

export async function listBrands(db: Db, workspaceId: string) {
  return withWorkspace(db, workspaceId, (tx) =>
    tx.select().from(brands).orderBy(desc(brands.createdAt)),
  );
}

export async function getBrand(db: Db, workspaceId: string, brandId: string) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [brand] = await tx.select().from(brands).where(eq(brands.id, brandId));
    return brand ?? null;
  });
}

export async function createBrand(
  db: Db,
  workspaceId: string,
  input: { name: string; sourceUrl?: string },
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    try {
      const [brand] = await tx
        .insert(brands)
        .values({ workspaceId, name: input.name, sourceUrl: input.sourceUrl ?? null })
        .returning();
      return brand!;
    } catch (err) {
      if (err instanceof Error && "code" in err && (err as { code: string }).code === "23505") {
        throw new BrandNameTakenError(input.name);
      }
      throw err;
    }
  });
}

export async function updateBrand(
  db: Db,
  workspaceId: string,
  brandId: string,
  patch: Partial<typeof brands.$inferInsert>,
): Promise<typeof brands.$inferSelect | null> {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [brand] = await tx.update(brands).set(patch).where(eq(brands.id, brandId)).returning();
    return brand ?? null;
  });
}

export async function addBrandAsset(
  db: Db,
  workspaceId: string,
  asset: typeof brandAssets.$inferInsert,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [brandAsset] = await tx.insert(brandAssets).values(asset).returning();
    return brandAsset!;
  });
}

export async function listBrandAssets(db: Db, workspaceId: string, brandId: string) {
  return withWorkspace(db, workspaceId, (tx) =>
    tx
      .select()
      .from(brandAssets)
      .where(and(eq(brandAssets.brandId, brandId), eq(brandAssets.workspaceId, workspaceId)))
      .orderBy(desc(brandAssets.createdAt)),
  );
}

export async function deleteBrandAsset(
  db: Db,
  workspaceId: string,
  brandId: string,
  assetId: string,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [asset] = await tx
      .delete(brandAssets)
      .where(
        and(
          eq(brandAssets.id, assetId),
          eq(brandAssets.brandId, brandId),
          eq(brandAssets.workspaceId, workspaceId),
        ),
      )
      .returning();
    return asset ?? null;
  });
}
