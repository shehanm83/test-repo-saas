import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDb } from "./client";
import { users, workspaces } from "./schema";
import { withWorkspace } from "./with-workspace";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5432/studio";

describe("withWorkspace RLS", () => {
  it("prevents cross-tenant workspace reads for app_user", async () => {
    const adminDb = createDb(databaseUrl, "app_admin");
    const userDb = createDb(databaseUrl, "app_user");

    const [user] = await adminDb
      .insert(users)
      .values({ email: `tenant-${Date.now()}@example.test` })
      .returning();
    expect(user).toBeDefined();
    const [workspaceA] = await adminDb
      .insert(workspaces)
      .values({ ownerUserId: user!.id, name: `Workspace A ${Date.now()}` })
      .returning();
    expect(workspaceA).toBeDefined();
    await adminDb
      .insert(workspaces)
      .values({ ownerUserId: user!.id, name: `Workspace B ${Date.now()}` })
      .returning();

    const visible = await withWorkspace(
      userDb,
      workspaceA!.id,
      async (tx) => tx.execute(sql`select id from workspaces`),
      user!.id,
    );

    expect(visible.length).toBe(1);
  });
});
