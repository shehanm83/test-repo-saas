import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDb } from "../client";
import { withWorkspace } from "../with-workspace";

import { brands, users, workspaces } from "./index";

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
