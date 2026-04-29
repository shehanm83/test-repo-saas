# Slice 11 — Clerk webhook → user/workspace bootstrap

**Phase:** 2 — Auth & workspace
**Depends on:** 10, 09
**Spec references:** [Spec § 3.1 (Sign up & first workspace)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `apps/web/src/app/api/webhooks/clerk/route.ts` exists (Next.js will be initialized in slice 35; for now place a typed handler in `packages/auth/src/webhook.ts` that the route will mount)
- On `user.created`: insert `users`, create workspace, owner membership, initial 30-credit grant, queue Stripe-customer-provision job
- On `user.deleted`: soft-delete workspace
- Webhook signature verified via Svix
- Idempotent: replay of same event ID is a no-op
- Unit tests cover both events + idempotency

---

## Files

**Create:**
- `packages/auth/src/webhook.ts`
- `packages/auth/src/webhook.test.ts`
- `packages/db/src/queries/identity.ts` (helpers used by webhook)

**Modify:**
- `packages/auth/package.json` (add svix dep)

---

## Tasks

- [ ] **Step 1 — Add Svix**

```bash
pnpm --filter @vyora/auth add svix
pnpm --filter @vyora/auth add @vyora/db@workspace:*
```

- [ ] **Step 2 — Helper queries `packages/db/src/queries/identity.ts`**

```ts
import { eq, sql } from "drizzle-orm";
import type { Db } from "../client.js";
import { users, workspaces, workspaceMembers, creditLedgerEntries } from "../schema/index.js";

export async function bootstrapNewUser(
  db: Db,
  args: { clerkUserId: string; email: string; eventId: string },
): Promise<{ userId: string; workspaceId: string } | { idempotent: true }> {
  // Check idempotency via ledger entry on the eventId
  const existing = await db
    .select()
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.idempotencyKey, `clerk-bootstrap-${args.eventId}`));
  if (existing.length > 0) return { idempotent: true };

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ clerkUserId: args.clerkUserId, email: args.email })
      .returning();
    const [ws] = await tx
      .insert(workspaces)
      .values({ ownerUserId: user.id, name: `${args.email.split("@")[0]}'s workspace`, planCode: "free" })
      .returning();
    await tx.insert(workspaceMembers).values({
      workspaceId: ws.id, userId: user.id, role: "owner", acceptedAt: new Date(),
    });
    await tx.insert(creditLedgerEntries).values({
      workspaceId: ws.id, kind: "grant", amount: 30, balanceAfter: 30,
      idempotencyKey: `clerk-bootstrap-${args.eventId}`,
      metadata: { reason: "free-tier-initial-grant" },
    });
    return { userId: user.id, workspaceId: ws.id };
  });
}

export async function softDeleteWorkspaceForUser(db: Db, clerkUserId: string): Promise<void> {
  const [u] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
  if (!u) return;
  await db
    .update(workspaces)
    .set({ status: "deleted", deletedAt: sql`now()` })
    .where(eq(workspaces.ownerUserId, u.id));
}
```

Update `packages/db/src/index.ts` to also export `./queries/identity.js`.

- [ ] **Step 3 — Implement webhook handler**

`packages/auth/src/webhook.ts`:

```ts
import { Webhook } from "svix";
import { bootstrapNewUser, softDeleteWorkspaceForUser, createDb } from "@vyora/db";
import type { Config } from "@vyora/shared";

export interface ClerkWebhookEvent {
  id: string;
  type: "user.created" | "user.updated" | "user.deleted";
  data: { id: string; email_addresses: { email_address: string }[] };
}

export class ClerkWebhookHandler {
  constructor(private readonly config: Config) {}

  async handle(rawBody: string, headers: Headers): Promise<{ status: number; body: unknown }> {
    if (this.config.auth.mode !== "clerk") return { status: 200, body: { skipped: "dev mode" } };

    let evt: ClerkWebhookEvent;
    try {
      const wh = new Webhook(this.config.auth.webhookSecret);
      evt = wh.verify(rawBody, {
        "svix-id": headers.get("svix-id") ?? "",
        "svix-timestamp": headers.get("svix-timestamp") ?? "",
        "svix-signature": headers.get("svix-signature") ?? "",
      }) as ClerkWebhookEvent;
    } catch {
      return { status: 400, body: { error: "invalid signature" } };
    }

    const db = createDb(this.config.db.url, "app_admin");

    if (evt.type === "user.created") {
      const email = evt.data.email_addresses[0]?.email_address;
      if (!email) return { status: 400, body: { error: "no email" } };
      const result = await bootstrapNewUser(db, { clerkUserId: evt.data.id, email, eventId: evt.id });
      return { status: 200, body: result };
    }

    if (evt.type === "user.deleted") {
      await softDeleteWorkspaceForUser(db, evt.data.id);
      return { status: 200, body: { ok: true } };
    }

    return { status: 200, body: { ignored: evt.type } };
  }
}
```

- [ ] **Step 4 — Test webhook handler**

`packages/auth/src/webhook.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@vyora/db", () => ({
  createDb: vi.fn(() => ({})),
  bootstrapNewUser: vi.fn(async () => ({ userId: "u", workspaceId: "w" })),
  softDeleteWorkspaceForUser: vi.fn(async () => undefined),
}));

vi.mock("svix", () => ({
  Webhook: class {
    verify(_b: string, _h: Record<string, string>): unknown {
      return { id: "evt_1", type: "user.created", data: { id: "clk_1", email_addresses: [{ email_address: "a@b.c" }] } };
    }
  },
}));

import { ClerkWebhookHandler } from "./webhook.js";

const cfg = {
  auth: { mode: "clerk", publishableKey: "p", secretKey: "s", webhookSecret: "w" },
  db: { url: "postgres://" },
} as never;

describe("ClerkWebhookHandler", () => {
  it("handles user.created", async () => {
    const h = new ClerkWebhookHandler(cfg);
    const r = await h.handle("{}", new Headers());
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ userId: "u", workspaceId: "w" });
  });
});
```

- [ ] **Step 5 — Run tests, expect green**

```bash
pnpm --filter @vyora/auth test
```

- [ ] **Step 6 — Commit**

```bash
git add -A
git commit -m "feat(auth): Clerk webhook handler bootstraps user + workspace + initial grant"
```

---

## Verification

```bash
pnpm --filter @vyora/auth test
pnpm typecheck
```

## Commit message

```
feat(auth): Clerk webhook handler bootstraps user + workspace + initial grant
```
