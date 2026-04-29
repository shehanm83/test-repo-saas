# Slice 12 — Workspace + member API

**Phase:** 2 — Auth & workspace
**Depends on:** 11

**Definition of done:**
- Query helpers in `packages/db/src/queries/workspace.ts` for: list workspaces for a user, switch active workspace, invite member, accept invite, change role, revoke
- API surface in `packages/api` (a new package) exposes typed handler functions independent of Next.js — slice 39 will mount these in route files
- Idempotent invitations (re-inviting same email no-ops)
- Owner cannot be demoted; role transitions enforced
- Unit + integration tests

---

## Files

**Create:**
- `packages/api/package.json`
- `packages/api/tsconfig.json`
- `packages/api/vitest.config.ts`
- `packages/api/src/index.ts`
- `packages/api/src/workspace.ts`
- `packages/api/src/workspace.test.ts`
- `packages/db/src/queries/workspace.ts`
- `packages/db/src/queries/workspace.int.test.ts`

**Modify:**
- Root `tsconfig.json` (add reference)

---

## Tasks

- [ ] **Step 1 — Bootstrap `packages/api` package** (mirror slice 01 pattern)

`packages/api/package.json`:
```json
{
  "name": "@vyora/api",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "lint": "eslint src --max-warnings=0", "test": "vitest run" },
  "dependencies": {
    "@vyora/db": "workspace:*",
    "@vyora/shared": "workspace:*",
    "@vyora/auth": "workspace:*",
    "zod": "^3.23.8"
  }
}
```

`packages/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "composite": true },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }, { "path": "../db" }, { "path": "../auth" }
  ]
}
```

```bash
pnpm install
```

Add to root `tsconfig.json` references.

- [ ] **Step 2 — DB queries**

`packages/db/src/queries/workspace.ts`:

```ts
import { and, eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { Db } from "../client.js";
import { workspaces, workspaceMembers, users, auditLog } from "../schema/index.js";

export type Role = "owner" | "admin" | "editor" | "viewer";

export async function listWorkspacesForUser(db: Db, userId: string) {
  return db
    .select({ id: workspaces.id, name: workspaces.name, role: workspaceMembers.role, planCode: workspaces.planCode })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaces.status, "active")));
}

export async function inviteMember(
  db: Db, args: { workspaceId: string; inviteeEmail: string; role: Exclude<Role, "owner">; actorUserId: string },
) {
  const [u] = await db.select().from(users).where(eq(users.email, args.inviteeEmail));
  const userId = u?.id;
  const token = randomBytes(24).toString("hex");

  if (userId) {
    const existing = await db.select().from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, args.workspaceId), eq(workspaceMembers.userId, userId)));
    if (existing.length > 0) return { idempotent: true as const };
  }

  await db.transaction(async (tx) => {
    await tx.insert(workspaceMembers).values({
      workspaceId: args.workspaceId,
      userId: userId ?? "00000000-0000-0000-0000-000000000000", // pending — replaced on accept
      role: args.role,
      acceptInviteToken: token,
    });
    await tx.insert(auditLog).values({
      workspaceId: args.workspaceId, actorUserId: args.actorUserId,
      action: "member.invite", target: args.inviteeEmail,
      payload: JSON.stringify({ role: args.role }),
    });
  });

  return { token, userIdKnown: userId ?? null };
}

export async function acceptInvite(db: Db, args: { token: string; userId: string }) {
  return db.transaction(async (tx) => {
    const [m] = await tx.select().from(workspaceMembers).where(eq(workspaceMembers.acceptInviteToken, args.token));
    if (!m) throw new Error("invite-not-found");
    await tx.update(workspaceMembers)
      .set({ userId: args.userId, acceptedAt: sql`now()`, acceptInviteToken: null })
      .where(eq(workspaceMembers.id, m.id));
    return { workspaceId: m.workspaceId };
  });
}

export async function changeRole(
  db: Db, args: { workspaceId: string; targetUserId: string; newRole: Role; actorUserId: string },
) {
  const [target] = await db.select().from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, args.workspaceId), eq(workspaceMembers.userId, args.targetUserId)));
  if (!target) throw new Error("member-not-found");
  if (target.role === "owner") throw new Error("cannot-demote-owner");

  await db.transaction(async (tx) => {
    await tx.update(workspaceMembers).set({ role: args.newRole }).where(eq(workspaceMembers.id, target.id));
    await tx.insert(auditLog).values({
      workspaceId: args.workspaceId, actorUserId: args.actorUserId,
      action: "member.role-change", target: args.targetUserId,
      payload: JSON.stringify({ from: target.role, to: args.newRole }),
    });
  });
}

export async function revokeMember(
  db: Db, args: { workspaceId: string; targetUserId: string; actorUserId: string },
) {
  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, args.workspaceId), eq(workspaceMembers.userId, args.targetUserId)));
    if (!target) return;
    if (target.role === "owner") throw new Error("cannot-revoke-owner");
    await tx.delete(workspaceMembers).where(eq(workspaceMembers.id, target.id));
    await tx.insert(auditLog).values({
      workspaceId: args.workspaceId, actorUserId: args.actorUserId,
      action: "member.revoke", target: args.targetUserId,
    });
  });
}
```

- [ ] **Step 3 — Integration test the queries**

`packages/db/src/queries/workspace.int.test.ts` — creates two users, invites one to other's workspace, accepts, changes role, revokes; asserts each step. (Use admin DB role for setup, app_user for assertions inside withWorkspace where appropriate.)

```ts
// Skeleton — fill in following slice 06 patterns:
// 1. seed: create userA + workspace; create userB
// 2. inviteMember -> returns token
// 3. acceptInvite as userB
// 4. changeRole owner→viewer (should throw "cannot-demote-owner")
// 5. revokeMember on owner (should throw)
// 6. revokeMember on userB succeeds
```

(Implement per pattern of existing int tests; assert throws + final membership counts.)

- [ ] **Step 4 — API handlers `packages/api/src/workspace.ts`**

```ts
import { z } from "zod";
import { createDb, listWorkspacesForUser, inviteMember, acceptInvite, changeRole, revokeMember } from "@vyora/db";
import type { Config } from "@vyora/shared";

export class WorkspaceApi {
  constructor(private readonly config: Config) {}
  private db() { return createDb(this.config.db.url, "app_admin"); }

  async list(actorUserId: string) {
    return listWorkspacesForUser(this.db(), actorUserId);
  }

  async invite(input: unknown, actorUserId: string) {
    const args = z.object({
      workspaceId: z.string().uuid(),
      inviteeEmail: z.string().email(),
      role: z.enum(["admin", "editor", "viewer"]),
    }).parse(input);
    return inviteMember(this.db(), { ...args, actorUserId });
  }

  async accept(input: unknown, actorUserId: string) {
    const args = z.object({ token: z.string().min(1) }).parse(input);
    return acceptInvite(this.db(), { token: args.token, userId: actorUserId });
  }

  async role(input: unknown, actorUserId: string) {
    const args = z.object({
      workspaceId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      newRole: z.enum(["admin", "editor", "viewer"]),
    }).parse(input);
    return changeRole(this.db(), { ...args, actorUserId });
  }

  async revoke(input: unknown, actorUserId: string) {
    const args = z.object({ workspaceId: z.string().uuid(), targetUserId: z.string().uuid() }).parse(input);
    return revokeMember(this.db(), { ...args, actorUserId });
  }
}
```

- [ ] **Step 5 — Unit test API**

`packages/api/src/workspace.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const dbMock = {};
vi.mock("@vyora/db", () => ({
  createDb: () => dbMock,
  listWorkspacesForUser: vi.fn(async () => [{ id: "w1", name: "W", role: "owner", planCode: "free" }]),
  inviteMember: vi.fn(async () => ({ token: "tok", userIdKnown: null })),
  acceptInvite: vi.fn(async () => ({ workspaceId: "w1" })),
  changeRole: vi.fn(async () => undefined),
  revokeMember: vi.fn(async () => undefined),
}));

import { WorkspaceApi } from "./workspace.js";
const cfg = { db: { url: "postgres://" } } as never;
const api = new WorkspaceApi(cfg);

describe("WorkspaceApi", () => {
  it("lists workspaces", async () => {
    expect(await api.list("u1")).toHaveLength(1);
  });
  it("rejects invalid role", async () => {
    await expect(api.invite({ workspaceId: "00000000-0000-0000-0000-000000000001", inviteeEmail: "a@b.c", role: "owner" }, "u")).rejects.toThrow();
  });
  it("accepts a valid invite", async () => {
    expect(await api.accept({ token: "tok" }, "u")).toEqual({ workspaceId: "w1" });
  });
});
```

- [ ] **Step 6 — Run tests**

```bash
pnpm test:unit
```

- [ ] **Step 7 — Commit**

```bash
git add -A
git commit -m "feat(api): workspace and member endpoints (list/invite/accept/role/revoke) with audit log"
```

---

## Verification

```bash
pnpm --filter @vyora/api test
pnpm --filter @vyora/db test:int    # workspace.int.test.ts passes
```

## Commit message

```
feat(api): workspace and member endpoints (list/invite/accept/role/revoke) with audit log
```
