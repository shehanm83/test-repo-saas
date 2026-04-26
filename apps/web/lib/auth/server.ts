import { headers } from "next/headers";

import {
  createDb,
  listWorkspacesForUser,
  users,
  workspaces,
  workspaceMembers,
} from "@studio/db";
import { and, eq, isNotNull } from "@studio/db/operators";
import { loadConfig, createAdapters } from "@studio/shared";

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

export async function getServerSession(): Promise<
  | (ServerSession & {
      workspaces: SessionWorkspace[];
    })
  | null
> {
  const config = loadConfig();
  const adapters = createAdapters(config);
  const requestHeaders = new Headers(await headers());
  const identity = await adapters.auth.verifyRequest(requestHeaders);

  if (!identity) {
    return null;
  }

  const db = createDb(config.db.url, "app_admin");
  const [user] =
    config.auth.mode === "clerk"
      ? await db.select().from(users).where(eq(users.clerkUserId, identity.userId)).limit(1)
      : await db.select().from(users).where(eq(users.id, identity.userId)).limit(1);

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
