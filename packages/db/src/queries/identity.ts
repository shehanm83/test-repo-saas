import { and, desc, eq, sql } from "drizzle-orm";

import type { Db } from "../client";
import { creditLedgerEntries, users, workspaceMembers, workspaces } from "../schema";

export async function bootstrapNewUser(
  db: Db,
  args: { clerkUserId: string; email: string; eventId: string },
): Promise<{ userId: string; workspaceId: string } | { idempotent: true }> {
  const idempotencyKey = `clerk-bootstrap-${args.eventId}`;
  const existingBootstrap = await db
    .select({ id: creditLedgerEntries.id })
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existingBootstrap.length > 0) {
    return { idempotent: true };
  }

  return db.transaction(async (tx) => {
    const existingUser = await tx
      .select()
      .from(users)
      .where(eq(users.clerkUserId, args.clerkUserId))
      .limit(1);

    const user =
      existingUser[0] ??
      (
        await tx
          .insert(users)
          .values({
            clerkUserId: args.clerkUserId,
            email: args.email,
          })
          .returning()
      )[0]!;

    const existingWorkspace = await tx
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerUserId, user.id))
      .limit(1);

    const workspace =
      existingWorkspace[0] ??
      (
        await tx
          .insert(workspaces)
          .values({
            ownerUserId: user.id,
            name: `${args.email.split("@")[0] ?? "studio"}'s workspace`,
            planCode: "free",
          })
          .returning()
      )[0]!;

    const membership = await tx
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, user.id)),
      );

    if (!membership.some((row) => row.id)) {
      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
        acceptedAt: new Date(),
      });
    }

    const currentBalance = await tx
      .select({ balanceAfter: creditLedgerEntries.balanceAfter })
      .from(creditLedgerEntries)
      .where(eq(creditLedgerEntries.workspaceId, workspace.id))
      .orderBy(desc(creditLedgerEntries.createdAt))
      .limit(1);

    const nextBalance = (currentBalance[0]?.balanceAfter ?? 0) + 30;

    await tx.insert(creditLedgerEntries).values({
      workspaceId: workspace.id,
      kind: "grant",
      amount: 30,
      balanceAfter: nextBalance,
      idempotencyKey,
      metadata: {
        reason: "free-tier-initial-grant",
        source: "clerk-webhook",
      },
    });

    return { userId: user.id, workspaceId: workspace.id };
  });
}

export async function softDeleteWorkspaceForUser(db: Db, clerkUserId: string): Promise<void> {
  const user = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);

  if (!user[0]) {
    return;
  }

  await db
    .update(workspaces)
    .set({ status: "deleted", deletedAt: sql`now()` })
    .where(eq(workspaces.ownerUserId, user[0].id));
}
