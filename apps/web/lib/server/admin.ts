import { createDb, auditLog } from "@studio/db";
import { loadConfig } from "@studio/shared";

export async function writeAdminAudit(args: {
  workspaceId: string;
  actorUserId: string;
  action: string;
  target?: string | null;
  payload?: unknown;
}) {
  const db = createDb(loadConfig().db.url, "app_admin");
  await db.insert(auditLog).values({
    workspaceId: args.workspaceId,
    actorUserId: args.actorUserId,
    action: args.action,
    target: args.target ?? null,
    payload: args.payload ? JSON.stringify(args.payload) : null,
    isAdminAction: true,
  });
}

