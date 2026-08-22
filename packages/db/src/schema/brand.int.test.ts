import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDb } from "../client";
import { withWorkspace } from "../with-workspace";

import { updateBrandAsset } from "../queries/brand";
import { brandAssets, brands, users, workspaces } from "./index";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://layertone:dev@localhost:5432/layertone";

describe("brand RLS", () => {
  it("brand of workspace B not visible from workspace A scope", async () => {
    const adminDb = createDb(databaseUrl, "app_admin");
    const userDb = createDb(databaseUrl, "app_user");

    const [user] = await adminDb
      .insert(users)
      .values({ email: `brand-${Date.now()}@example.test` })
      .returning();
    expect(user).toBeDefined();
    const [workspaceA] = await adminDb
      .insert(workspaces)
      .values({ ownerUserId: user!.id, name: `Workspace A ${Date.now()}` })
      .returning();
    expect(workspaceA).toBeDefined();
    const [workspaceB] = await adminDb
      .insert(workspaces)
      .values({ ownerUserId: user!.id, name: `Workspace B ${Date.now()}` })
      .returning();
    expect(workspaceB).toBeDefined();

    await adminDb.insert(brands).values({ workspaceId: workspaceB!.id, name: "B-brand" });

    const visible = await withWorkspace(
      userDb,
      workspaceA!.id,
      async (tx) => tx.execute(sql`select name from brands`),
      user!.id,
    );

    expect(visible.length).toBe(0);
  });
});

describe("primary brand logo", () => {
  it("allows one primary logo per brand and hands the slot over on update", async () => {
    const adminDb = createDb(databaseUrl, "app_admin");

    const [user] = await adminDb
      .insert(users)
      .values({ email: `logo-${Date.now()}@example.test` })
      .returning();
    const [workspace] = await adminDb
      .insert(workspaces)
      .values({ ownerUserId: user!.id, name: `Logo workspace ${Date.now()}` })
      .returning();
    const [brand] = await adminDb
      .insert(brands)
      .values({ workspaceId: workspace!.id, name: "Logo brand" })
      .returning();

    const asset = (s3Key: string, isPrimary: boolean) => ({
      workspaceId: workspace!.id,
      brandId: brand!.id,
      kind: "logo" as const,
      s3Key,
      mimeType: "image/png",
      isPrimary,
    });

    const [first] = await adminDb.insert(brandAssets).values(asset("a.png", true)).returning();
    const [second] = await adminDb.insert(brandAssets).values(asset("b.png", false)).returning();

    // The partial unique index is what keeps "primary" meaningful.
    await expect(
      adminDb.insert(brandAssets).values(asset("c.png", true)),
    ).rejects.toThrow();

    const promoted = await updateBrandAsset(
      createDb(databaseUrl, "app_admin"),
      workspace!.id,
      brand!.id,
      second!.id,
      { isPrimary: true },
    );

    expect(promoted?.isPrimary).toBe(true);

    const rows = await adminDb.execute<{ id: string; is_primary: boolean }>(
      sql`select id, is_primary from brand_assets where brand_id = ${brand!.id}`,
    );
    expect(rows.filter((row) => row.is_primary).map((row) => row.id)).toEqual([second!.id]);
    expect(rows.find((row) => row.id === first!.id)?.is_primary).toBe(false);

    const [updatedBrand] = await adminDb.execute<{ logo_s3_key: string }>(
      sql`select logo_s3_key from brands where id = ${brand!.id}`,
    );
    expect(updatedBrand?.logo_s3_key).toBe("b.png");
  });
});
