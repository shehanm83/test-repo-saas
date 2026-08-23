import { cookies, headers } from "next/headers";

import { ClerkAuthProvider, DevAuthProvider } from "@layertone/auth";
import {
  createDb,
  listWorkspacesForUser,
  users,
  workspaces,
  workspaceMembers,
} from "@layertone/db";
import { bootstrapNewUser } from "@layertone/db/queries/identity";
import { and, eq, isNotNull } from "@layertone/db/operators";
import { loadConfig } from "@layertone/shared/config";

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

export const ACTIVE_WORKSPACE_COOKIE = "lt_active_workspace_id";

function configuredAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function getServerSession(): Promise<
  | (ServerSession & {
      workspaces: SessionWorkspace[];
    })
  | null
> {
  const config = loadConfig();
  const auth =
    config.auth.mode === "clerk"
      ? new ClerkAuthProvider({
          publishableKey: config.auth.publishableKey,
          secretKey: config.auth.secretKey,
        })
      : new DevAuthProvider(config.auth.devUserId);
  const requestHeaders = new Headers(await headers());
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

  if (configuredAdminEmails().includes(user.email.toLowerCase()) && user.role !== "admin") {
    const [promoted] = await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, user.id))
      .returning();
    if (promoted) user = promoted;
  }

  const memberWorkspaces = await listWorkspacesForUser(db, user.id);
  const cookieWorkspaceId = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;
  const preferredWorkspaceId =
    requestHeaders.get("x-dev-workspace-id") ?? cookieWorkspaceId ?? identity.workspaceId;
  const workspaceId =
    preferredWorkspaceId &&
    memberWorkspaces.some((workspace) => workspace.id === preferredWorkspaceId)
      ? preferredWorkspaceId
      : (memberWorkspaces[0]?.id ?? null);

  return {
    authUserId: identity.userId,
    userId: user.id,
    email: user.email,
    role: user.role,
    workspaceId,
    workspaces: memberWorkspaces,
  };
}

export async function requireSession() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("unauthorized");
  }

  return session;
}

export async function getSessionWorkspace() {
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
}

/**
 * Resolve the current admin together with their active workspace. API routes
 * must use this helper instead of relying on the `/admin` layout, because
 * route handlers are not protected by that layout.
 */
export async function getAdminSessionWorkspace() {
  const session = await getServerSession();
  if (!session || session.role !== "admin") return null;
  if (!session.workspaceId) return { session, workspace: null };

  const db = createDb(loadConfig().db.url, "app_admin");
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, session.workspaceId))
    .limit(1);

  return { session, workspace: workspace ?? null };
}

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
      and(eq(workspaceMembers.workspaceId, workspaceId), isNotNull(workspaceMembers.acceptedAt)),
    );
}
