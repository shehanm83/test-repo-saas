# Slice 19 — Credit ledger primitives

**Phase:** 5 — Credit ledger
**Depends on:** 09
**Spec references:** [Spec § 6 (Billing & credit ledger)](../specs/2026-04-25-studio-v1-spec.md), [Spec § 3.4 step 9 (commit / release semantics)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `packages/billing` package with `Ledger` class
- Atomic operations: `grant`, `topup`, `reserve`, `commit`, `release`, `refund`, `adjustment`
- Each call requires `idempotencyKey`; retry with same key returns the same result without double-write
- Balance non-negative invariant enforced (Postgres CHECK + application guard)
- `getBalance(workspaceId)` returns sum
- Concurrency test: 100 parallel reservations against a $50 budget never produces negative balance

---

## Files

**Create:**
- `packages/billing/{package.json,tsconfig.json,vitest.config.ts}`
- `packages/billing/src/{index.ts,ledger.ts,errors.ts,ledger.int.test.ts}`

---

## Tasks

- [ ] **Step 1 — Bootstrap package**

Mirror prior packages. Deps:
```bash
pnpm --filter @studio/billing add @studio/db@workspace:* @studio/shared@workspace:* drizzle-orm
```

- [ ] **Step 2 — Errors**

`packages/billing/src/errors.ts`:

```ts
export class InsufficientCredits extends Error {
  constructor(public balance: number, public requested: number) {
    super(`insufficient credits: have ${balance}, need ${requested}`);
    this.name = "InsufficientCredits";
  }
}

export class IdempotencyConflict extends Error {
  constructor(public key: string) {
    super(`idempotency key already used: ${key}`);
    this.name = "IdempotencyConflict";
  }
}
```

- [ ] **Step 3 — Ledger class**

`packages/billing/src/ledger.ts`:

```ts
import { eq, sql } from "drizzle-orm";
import { creditLedgerEntries, withWorkspace, type Db } from "@studio/db";
import { InsufficientCredits } from "./errors.js";

type Kind = "grant" | "reservation" | "commit" | "release" | "topup" | "refund" | "adjustment";

export interface LedgerEntry {
  kind: Kind;
  amount: number;             // signed; reservation/commit/refund use negative; grant/topup/release positive
  workspaceId: string;
  idempotencyKey: string;
  generationId?: string;
  captionJobId?: string;
  stripeEventId?: string;
  metadata?: Record<string, unknown>;
}

export class Ledger {
  constructor(private readonly db: Db) {}

  /**
   * Inserts a ledger entry inside a transaction with `app.current_workspace_id` set.
   * Idempotent on idempotencyKey.
   * Throws InsufficientCredits if balanceAfter would be negative.
   */
  async post(entry: LedgerEntry): Promise<{ id: string; balanceAfter: number; idempotent: boolean }> {
    return withWorkspace(this.db, entry.workspaceId, async (tx) => {
      // Idempotency check
      const [existing] = await tx
        .select()
        .from(creditLedgerEntries)
        .where(eq(creditLedgerEntries.idempotencyKey, entry.idempotencyKey));
      if (existing) {
        return { id: existing.id, balanceAfter: existing.balanceAfter, idempotent: true };
      }

      // Compute balance via lock + sum (FOR UPDATE to serialize concurrent posts on same workspace)
      const r = await tx.execute<{ balance: number }>(sql`
        SELECT COALESCE(SUM(amount), 0)::int AS balance
        FROM credit_ledger_entries
        WHERE workspace_id = ${entry.workspaceId}
        FOR UPDATE
      `);
      const current = r[0]?.balance ?? 0;
      const next = current + entry.amount;

      if (next < 0) throw new InsufficientCredits(current, -entry.amount);

      const [inserted] = await tx.insert(creditLedgerEntries).values({
        workspaceId: entry.workspaceId,
        kind: entry.kind,
        amount: entry.amount,
        balanceAfter: next,
        generationId: entry.generationId ?? null,
        captionJobId: entry.captionJobId ?? null,
        stripeEventId: entry.stripeEventId ?? null,
        idempotencyKey: entry.idempotencyKey,
        metadata: entry.metadata ?? null,
      }).returning();

      return { id: inserted.id, balanceAfter: next, idempotent: false };
    });
  }

  async getBalance(workspaceId: string): Promise<number> {
    return withWorkspace(this.db, workspaceId, async (tx) => {
      const r = await tx.execute<{ balance: number }>(sql`
        SELECT COALESCE(SUM(amount), 0)::int AS balance
        FROM credit_ledger_entries
        WHERE workspace_id = ${workspaceId}
      `);
      return r[0]?.balance ?? 0;
    });
  }

  // Convenience helpers
  grant(args: { workspaceId: string; amount: number; idempotencyKey: string; metadata?: Record<string, unknown>; stripeEventId?: string }) {
    return this.post({ ...args, kind: "grant" });
  }
  topup(args: { workspaceId: string; amount: number; idempotencyKey: string; stripeEventId?: string }) {
    return this.post({ ...args, kind: "topup" });
  }
  reserve(args: { workspaceId: string; amount: number; idempotencyKey: string; generationId?: string; captionJobId?: string }) {
    return this.post({ ...args, kind: "reservation", amount: -Math.abs(args.amount) });
  }
  commit(args: { workspaceId: string; amount: number; idempotencyKey: string; generationId?: string; captionJobId?: string }) {
    return this.post({ ...args, kind: "commit", amount: -Math.abs(args.amount) });
  }
  release(args: { workspaceId: string; amount: number; idempotencyKey: string; generationId?: string; captionJobId?: string }) {
    return this.post({ ...args, kind: "release", amount: Math.abs(args.amount) });
  }
  refund(args: { workspaceId: string; amount: number; idempotencyKey: string; stripeEventId?: string }) {
    return this.post({ ...args, kind: "refund", amount: -Math.abs(args.amount) });
  }
  adjustment(args: { workspaceId: string; amount: number; idempotencyKey: string; metadata?: Record<string, unknown> }) {
    return this.post({ ...args, kind: "adjustment" });
  }
}
```

- [ ] **Step 4 — Index**

```ts
export * from "./ledger.js";
export * from "./errors.js";
```

- [ ] **Step 5 — Add SQL CHECK constraint** (DB-level invariant)

Add a follow-up migration `0005_ledger_check.sql` (`pnpm db:generate --name=ledger_check`):

```sql
ALTER TABLE credit_ledger_entries ADD CONSTRAINT ledger_balance_after_nonneg CHECK (balance_after >= 0);
```

Run: `pnpm --filter @studio/db db:migrate`.

- [ ] **Step 6 — Integration test (concurrency)**

`packages/billing/src/ledger.int.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDb, users, workspaces } from "@studio/db";
import { Ledger } from "./ledger.js";

const url = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5432/studio";
const db = createDb(url, "app_admin");

async function setup() {
  const [u] = await db.insert(users).values({ email: `t-${Date.now()}@x.test` }).returning();
  const [w] = await db.insert(workspaces).values({ ownerUserId: u.id, name: "L" }).returning();
  return { workspaceId: w.id };
}

describe("Ledger", () => {
  it("grant + reserve + commit basic flow", async () => {
    const { workspaceId } = await setup();
    const l = new Ledger(db);
    await l.grant({ workspaceId, amount: 50, idempotencyKey: "g1" });
    expect(await l.getBalance(workspaceId)).toBe(50);
    await l.reserve({ workspaceId, amount: 20, idempotencyKey: "r1" });
    expect(await l.getBalance(workspaceId)).toBe(30);
    await l.commit({ workspaceId, amount: 10, idempotencyKey: "c1" });
    await l.release({ workspaceId, amount: 10, idempotencyKey: "rel1" });
    expect(await l.getBalance(workspaceId)).toBe(30);
  });

  it("idempotency: re-using key is a no-op", async () => {
    const { workspaceId } = await setup();
    const l = new Ledger(db);
    await l.grant({ workspaceId, amount: 50, idempotencyKey: "k1" });
    const r = await l.grant({ workspaceId, amount: 50, idempotencyKey: "k1" });
    expect(r.idempotent).toBe(true);
    expect(await l.getBalance(workspaceId)).toBe(50);
  });

  it("rejects negative balance", async () => {
    const { workspaceId } = await setup();
    const l = new Ledger(db);
    await l.grant({ workspaceId, amount: 10, idempotencyKey: "g" });
    await expect(l.reserve({ workspaceId, amount: 20, idempotencyKey: "r" })).rejects.toThrow(/insufficient/);
  });

  it("100 parallel reservations against a 50-credit budget never go negative", async () => {
    const { workspaceId } = await setup();
    const l = new Ledger(db);
    await l.grant({ workspaceId, amount: 50, idempotencyKey: "seed" });

    const tries = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) =>
        l.reserve({ workspaceId, amount: 1, idempotencyKey: `p-${i}` }),
      ),
    );
    const successes = tries.filter((t) => t.status === "fulfilled").length;
    expect(successes).toBe(50);
    expect(await l.getBalance(workspaceId)).toBe(0);
  });
});
```

- [ ] **Step 7 — Run integration**

```bash
pnpm --filter @studio/db db:migrate
DATABASE_URL=postgres://studio:dev@localhost:5432/studio pnpm test:int
```

- [ ] **Step 8 — Commit**

```bash
git add -A
git commit -m "feat(billing): credit ledger primitives with idempotency + concurrency-safe non-negative invariant"
```

---

## Verification

```bash
pnpm test:int
psql "$DATABASE_URL" -c "\d credit_ledger_entries" | grep ledger_balance_after_nonneg
```

## Commit message

```
feat(billing): credit ledger primitives with idempotency + concurrency-safe non-negative invariant
```
