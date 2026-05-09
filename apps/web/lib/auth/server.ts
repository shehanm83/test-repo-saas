import { cache } from "react";
import { headers } from "next/headers";

import { ClerkAuthProvider, DevAuthProvider } from "@vyora/auth";
import {
  createDb,
  listWorkspacesForUser,
  users,
  workspaces,
  workspaceMembers,
} from "@vyora/db";
import { bootstrapNewUser } from "@vyora/db/queries/identity";
import { and, eq, isNotNull } from "@vyora/db/operators";
import { loadConfig } from "@vyora/shared/config";

export interface ServerSession {
  authUserId: string;
  userId: string;
  email: string;
  role: "user" | "admin";
  workspaceId: string | null;
}

export interface SessionWorkspace {
  id: string;
  name: string;
  role: string;
  planCode: string;
  status: string;
}

// React.cache memoises across all Server Component / route-handler calls
// within a single request. The session shape doesn't change mid-request, so
// the layout chain (root + (app) + page) hits this once instead of three
// times. Audit fix #1.
export const getServerSession = cache(
  async (): Promise<
    | (ServerSession & {
        workspaces: SessionWorkspace[];
      })
    | null
  > => {
    const config = loadConfig();
    const requestHeaders = new Headers(await headers());

    // Staff super-admin path — injected by middleware after a successful HTTP
    // Basic check against staff_users. Independent of Clerk; staff aren't in
    // the customer `users` table, hence the synthesised session.
    const staffId = requestHeaders.get("x-staff-id");
    const staffUsername = requestHeaders.get("x-staff-username");
    if (staffId && staffUsername) {
      return {
        authUserId: staffId,
        userId: staffId,
        email: `${staffUsername}@staff.local`,
        role: "admin",
        workspaceId: null,
        workspaces: [],
      };
    }

    const auth =
      config.auth.mode === "clerk"
        ? new ClerkAuthProvider({
            publishableKey: config.auth.publishableKey,
            secretKey: config.auth.secretKey,
          })
        : new DevAuthProvider(config.auth.devUserId);
    const identity = await auth.verifyRequest(requestHeaders);

    if (!identity) {
      return null;
    }

    const db = createDb(config.db.url, "app_admin");
    let [user] =
      config.auth.mode === "clerk"
        ? await db.select().from(users).where(eq(users.clerkUserId, identity.userId)).limit(1)
        : await db.select().from(users).where(eq(users.id, identity.userId)).limit(1);

    if (!user && config.auth.mode === "clerk") {
      const { createClerkClient } = await import("@clerk/backend");
      const clerk = createClerkClient({ secretKey: config.auth.secretKey });
      const clerkUser = await clerk.users.getUser(identity.userId).catch(() => null);
      const email = clerkUser?.emailAddresses[0]?.emailAddress;
      if (email) {
        await bootstrapNewUser(db, {
          clerkUserId: identity.userId,
          email,
          eventId: `auto-bootstrap-${identity.userId}`,
        });
        [user] = await db.select().from(users).where(eq(users.clerkUserId, identity.userId)).limit(1);
      }
    }

    if (!user) {
      return null;
    }

    const memberWorkspaces = await listWorkspacesForUser(db, user.id);
    const requestedWorkspaceId = requestHeaders.get("x-dev-workspace-id") ?? identity.workspaceId;
    const workspaceId =
      requestedWorkspaceId && memberWorkspaces.some((workspace) => workspace.id === requestedWorkspaceId)
        ? requestedWorkspaceId
        : memberWorkspaces[0]?.id ?? null;

    return {
      authUserId: identity.userId,
      userId: user.id,
      email: user.email,
      role: user.role,
      workspaceId,
      workspaces: memberWorkspaces,
    };
  },
);

export async function requireSession() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("unauthorized");
  }

  return session;
}

export const getSessionWorkspace = cache(async () => {
  const session = await requireSession();
  if (!session.workspaceId) {
    return { session, workspace: null };
  }

  const db = createDb(loadConfig().db.url, "app_admin");
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, session.workspaceId))
    .limit(1);

  return { session, workspace: workspace ?? null };
});

export async function listWorkspaceMembers(workspaceId: string) {
  const db = createDb(loadConfig().db.url, "app_admin");
  return db
    .select({
      id: users.id,
      email: users.email,
      role: workspaceMembers.role,
      acceptedAt: workspaceMembers.acceptedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        isNotNull(workspaceMembers.acceptedAt),
      ),
    );
}
