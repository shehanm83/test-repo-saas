import { randomBytes } from "node:crypto";

import { and, eq, isNotNull } from "drizzle-orm";

import type { Db } from "../client";
import { auditLog, users, workspaceMembers, workspaces } from "../schema";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export async function listWorkspacesForUser(db: Db, userId: string) {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      role: workspaceMembers.role,
      planCode: workspaces.planCode,
      status: workspaces.status,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        isNotNull(workspaceMembers.acceptedAt),
        eq(workspaces.status, "active"),
      ),
    );
}

export async function switchActiveWorkspace(
  db: Db,
  args: { workspaceId: string; userId: string },
): Promise<{ workspaceId: string }> {
  const member = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, args.workspaceId),
        eq(workspaceMembers.userId, args.userId),
        isNotNull(workspaceMembers.acceptedAt),
      ),
    )
    .limit(1);

  if (!member[0]) {
    throw new Error("workspace-access-denied");
  }

  return { workspaceId: args.workspaceId };
}

export async function inviteMember(
  db: Db,
  args: {
    workspaceId: string;
    inviteeEmail: string;
    role: Exclude<WorkspaceRole, "owner">;
    actorUserId: string;
  },
): Promise<{ token: string; userIdKnown: string | null } | { idempotent: true }> {
  const invitee = await db.select().from(users).where(eq(users.email, args.inviteeEmail)).limit(1);
  const userId = invitee[0]?.id ?? null;

  if (!userId) {
    throw new Error("invitee-not-found");
  }

  const existing = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(eq(workspaceMembers.workspaceId, args.workspaceId), eq(workspaceMembers.userId, userId)),
    )
    .limit(1);

  if (existing[0]) {
    return { idempotent: true };
  }

  const token = randomBytes(24).toString("hex");

  await db.transaction(async (tx) => {
    await tx.insert(workspaceMembers).values({
      workspaceId: args.workspaceId,
      userId,
      role: args.role,
      acceptInviteToken: token,
    });

    await tx.insert(auditLog).values({
      workspaceId: args.workspaceId,
      actorUserId: args.actorUserId,
      action: "member.invite",
      target: args.inviteeEmail,
      payload: JSON.stringify({ role: args.role }),
    });
  });

  return { token, userIdKnown: userId };
}

export async function acceptInvite(
  db: Db,
  args: { token: string; userId: string },
): Promise<{ workspaceId: string }> {
  return db.transaction(async (tx) => {
    const membership = await tx
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.acceptInviteToken, args.token))
      .limit(1);

    if (!membership[0]) {
      throw new Error("invite-not-found");
    }

    if (membership[0].userId !== args.userId) {
      throw new Error("invite-user-mismatch");
    }

    await tx
      .update(workspaceMembers)
      .set({ acceptedAt: new Date(), acceptInviteToken: null })
      .where(eq(workspaceMembers.id, membership[0].id));

    return { workspaceId: membership[0].workspaceId };
  });
}

export async function changeRole(
  db: Db,
  args: {
    workspaceId: string;
    targetUserId: string;
    newRole: Exclude<WorkspaceRole, "owner">;
    actorUserId: string;
  },
): Promise<void> {
  const target = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, args.workspaceId),
        eq(workspaceMembers.userId, args.targetUserId),
      ),
    )
    .limit(1);

  if (!target[0]) {
    throw new Error("member-not-found");
  }

  if (target[0].role === "owner") {
    throw new Error("cannot-demote-owner");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(workspaceMembers)
      .set({ role: args.newRole })
      .where(eq(workspaceMembers.id, target[0]!.id));

    await tx.insert(auditLog).values({
      workspaceId: args.workspaceId,
      actorUserId: args.actorUserId,
      action: "member.role-change",
      target: args.targetUserId,
      payload: JSON.stringify({ from: target[0]!.role, to: args.newRole }),
    });
  });
}

export async function revokeMember(
  db: Db,
  args: { workspaceId: string; targetUserId: string; actorUserId: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    const target = await tx
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, args.workspaceId),
          eq(workspaceMembers.userId, args.targetUserId),
        ),
      )
      .limit(1);

    if (!target[0]) {
      return;
    }

    if (target[0].role === "owner") {
      throw new Error("cannot-revoke-owner");
    }

    await tx.delete(workspaceMembers).where(eq(workspaceMembers.id, target[0].id));

    await tx.insert(auditLog).values({
      workspaceId: args.workspaceId,
      actorUserId: args.actorUserId,
      action: "member.revoke",
      target: args.targetUserId,
    });
  });
}

export async function createWorkspace(
  db: Db,
  args: { name: string; userId: string },
): Promise<{ id: string; name: string }> {
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ ownerUserId: args.userId, name: args.name })
      .returning({ id: workspaces.id, name: workspaces.name });
    await tx.insert(workspaceMembers).values({
      workspaceId: workspace!.id,
      userId: args.userId,
      role: "owner",
      acceptedAt: new Date(),
    });
    return workspace!;
  });
}
