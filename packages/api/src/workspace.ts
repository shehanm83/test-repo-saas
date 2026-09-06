import {
  acceptInvite,
  changeRole,
  createDb,
  inviteMember,
  listWorkspacesForUser,
  switchActiveWorkspace,
  revokeMember,
} from "@layertone/db";
import { createAdapters } from "@layertone/shared/adapters";
import type { Config } from "@layertone/shared/config";
import { z } from "zod";

const inviteSchema = z.object({
  workspaceId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  inviteeEmail: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]),
});

const acceptSchema = z.object({
  token: z.string().min(1),
});

const switchSchema = z.object({
  workspaceId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
});

const roleSchema = z.object({
  workspaceId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  targetUserId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  newRole: z.enum(["admin", "editor", "viewer"]),
});

const revokeSchema = z.object({
  workspaceId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  targetUserId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
});

export class WorkspaceApi {
  private readonly auth;

  constructor(private readonly config: Config) {
    this.auth = createAdapters(config).auth;
  }

  private db() {
    return createDb(this.config.db.url, "app_admin");
  }

  async list(actorUserId: string) {
    return listWorkspacesForUser(this.db(), actorUserId);
  }

  async switch(input: unknown, actorUserId: string) {
    const args = switchSchema.parse(input);
    const result = await switchActiveWorkspace(this.db(), { ...args, userId: actorUserId });
    await this.auth.setActiveWorkspace(actorUserId, result.workspaceId);
    return result;
  }

  async invite(input: unknown, actorUserId: string) {
    const args = inviteSchema.parse(input);
    return inviteMember(this.db(), { ...args, actorUserId });
  }

  async accept(input: unknown, actorUserId: string) {
    const args = acceptSchema.parse(input);
    return acceptInvite(this.db(), { token: args.token, userId: actorUserId });
  }

  async role(input: unknown, actorUserId: string) {
    const args = roleSchema.parse(input);
    return changeRole(this.db(), { ...args, actorUserId });
  }

  async revoke(input: unknown, actorUserId: string) {
    const args = revokeSchema.parse(input);
    return revokeMember(this.db(), { ...args, actorUserId });
  }
}
