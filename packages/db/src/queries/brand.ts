import { and, count, desc, eq } from "drizzle-orm";

import type { Db } from "../client";
import { brandAssets, brands, workspaces } from "../schema";
import { withWorkspace } from "../with-workspace";

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

/** Brands already created against the workspace's plan allowance. */
export async function getBrandQuotaStatus(
  db: Db,
  workspaceId: string,
): Promise<{ used: number; limit: number }> {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [used] = await tx.select({ value: count() }).from(brands);
    const [workspace] = await tx
      .select({ brandQuota: workspaces.brandQuota })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));
    return { used: Number(used?.value ?? 0), limit: workspace?.brandQuota ?? 0 };
  });
}

export async function createBrand(
  db: Db,
  workspaceId: string,
  input: { name: string; sourceUrl?: string },
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [brand] = await tx
      .insert(brands)
      .values({ workspaceId, name: input.name, sourceUrl: input.sourceUrl ?? null })
      .returning();
    return brand!;
  });
}

export async function updateBrand(
  db: Db,
  workspaceId: string,
  brandId: string,
  patch: Partial<typeof brands.$inferInsert>,
): Promise<typeof brands.$inferSelect | null> {
  if (Object.keys(patch).length === 0) {
    return getBrand(db, workspaceId, brandId);
  }

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

export async function updateBrandAsset(
  db: Db,
  workspaceId: string,
  brandId: string,
  assetId: string,
  patch: Partial<typeof brandAssets.$inferInsert>,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    // The partial unique index allows one primary logo per brand, so the
    // outgoing primary has to stand down inside the same transaction.
    if (patch.isPrimary) {
      await tx
        .update(brandAssets)
        .set({ isPrimary: false })
        .where(and(eq(brandAssets.brandId, brandId), eq(brandAssets.isPrimary, true)));
    }

    const [asset] = await tx
      .update(brandAssets)
      .set(patch)
      .where(
        and(
          eq(brandAssets.id, assetId),
          eq(brandAssets.brandId, brandId),
          eq(brandAssets.workspaceId, workspaceId),
        ),
      )
      .returning();

    if (asset?.isPrimary) {
      await tx.update(brands).set({ logoS3Key: asset.s3Key }).where(eq(brands.id, brandId));
    }

    return asset ?? null;
  });
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
