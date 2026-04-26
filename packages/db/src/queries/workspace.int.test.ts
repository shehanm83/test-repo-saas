import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDb } from "../client";
import { users, workspaceMembers, workspaces } from "../schema";

import {
  acceptInvite,
  changeRole,
  inviteMember,
  listWorkspacesForUser,
  revokeMember,
} from "./workspace";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5432/studio";

describe("workspace queries", () => {
  it("invites, accepts, updates role, and revokes a member", async () => {
    const adminDb = createDb(databaseUrl, "app_admin");

    const [owner] = await adminDb
      .insert(users)
      .values({ email: `owner-${Date.now()}@example.test` })
      .returning();
    const [member] = await adminDb
      .insert(users)
      .values({ email: `member-${Date.now()}@example.test` })
      .returning();
    const [workspace] = await adminDb
      .insert(workspaces)
      .values({ ownerUserId: owner!.id, name: `Workspace ${Date.now()}` })
      .returning();

    await adminDb.insert(workspaceMembers).values({
      workspaceId: workspace!.id,
      userId: owner!.id,
      role: "owner",
      acceptedAt: new Date(),
    });

    const invite = await inviteMember(adminDb, {
      workspaceId: workspace!.id,
      inviteeEmail: member!.email,
      role: "viewer",
      actorUserId: owner!.id,
    });

    expect("idempotent" in invite).toBe(false);
    if ("idempotent" in invite) {
      return;
    }

    await expect(
      acceptInvite(adminDb, { token: invite.token, userId: member!.id }),
    ).resolves.toEqual({
      workspaceId: workspace!.id,
    });

    const listed = await listWorkspacesForUser(adminDb, member!.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.role).toBe("viewer");

    await expect(
      changeRole(adminDb, {
        workspaceId: workspace!.id,
        targetUserId: owner!.id,
        newRole: "admin",
        actorUserId: owner!.id,
      }),
    ).rejects.toThrow("cannot-demote-owner");

    await expect(
      revokeMember(adminDb, {
        workspaceId: workspace!.id,
        targetUserId: owner!.id,
        actorUserId: owner!.id,
      }),
    ).rejects.toThrow("cannot-revoke-owner");

    await expect(
      changeRole(adminDb, {
        workspaceId: workspace!.id,
        targetUserId: member!.id,
        newRole: "editor",
        actorUserId: owner!.id,
      }),
    ).resolves.toBeUndefined();

    await expect(
      revokeMember(adminDb, {
        workspaceId: workspace!.id,
        targetUserId: member!.id,
        actorUserId: owner!.id,
      }),
    ).resolves.toBeUndefined();

    const remaining = await adminDb
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspace!.id));

    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.userId).toBe(owner!.id);
  });
});
