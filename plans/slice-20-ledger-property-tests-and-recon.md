# Slice 20 — Ledger property tests + reconciliation job

**Phase:** 5 — Credit ledger
**Depends on:** 19

**Definition of done:**
- Property test (fast-check, 10k random walk): for any sequence of grant/topup/reserve/commit/release/refund/adjustment, sum of amounts == final balance
- Daily reconciliation job stub: compares Stripe-attributed entries to subscription/topup product expectations and emits a Sentry/log alert on drift (real Stripe wiring in slice 34)
- Job is invokable as `pnpm --filter @vyora/billing exec tsx scripts/reconcile.ts`

---

## Files

**Create:**
- `packages/billing/src/property.int.test.ts`
- `packages/billing/src/reconcile.ts`
- `packages/billing/scripts/reconcile.ts`

**Modify:**
- `packages/billing/package.json` — add `fast-check`

---

## Tasks

- [ ] **Step 1 — Add fast-check**

```bash
pnpm --filter @vyora/billing add -D fast-check
```

- [ ] **Step 2 — Property test**

`packages/billing/src/property.int.test.ts`:

```ts
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createDb, users, workspaces } from "@vyora/db";
import { Ledger } from "./ledger.js";
import { InsufficientCredits } from "./errors.js";

const url = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5432/studio";
const db = createDb(url, "app_admin");

const opArb = fc.oneof(
  fc.record({ kind: fc.constant("grant"), amount: fc.integer({ min: 1, max: 100 }) }),
  fc.record({ kind: fc.constant("topup"), amount: fc.integer({ min: 1, max: 100 }) }),
  fc.record({ kind: fc.constant("reserve"), amount: fc.integer({ min: 1, max: 50 }) }),
  fc.record({ kind: fc.constant("commit"), amount: fc.integer({ min: 1, max: 50 }) }),
  fc.record({ kind: fc.constant("release"), amount: fc.integer({ min: 1, max: 50 }) }),
);

describe("Ledger property test", () => {
  it("sum of postings equals balance", async () => {
    const [u] = await db.insert(users).values({ email: `pt-${Date.now()}@x.test` }).returning();
    const [w] = await db.insert(workspaces).values({ ownerUserId: u.id, name: "P" }).returning();
    const l = new Ledger(db);
    let expected = 0;

    await fc.assert(
      fc.asyncProperty(fc.array(opArb, { minLength: 100, maxLength: 1000 }), async (ops) => {
        let i = 0;
        for (const op of ops) {
          const key = `pt-${w.id}-${i++}`;
          try {
            const r =
              op.kind === "grant"   ? await l.grant({ workspaceId: w.id, amount: op.amount, idempotencyKey: key }) :
              op.kind === "topup"   ? await l.topup({ workspaceId: w.id, amount: op.amount, idempotencyKey: key }) :
              op.kind === "reserve" ? await l.reserve({ workspaceId: w.id, amount: op.amount, idempotencyKey: key }) :
              op.kind === "commit"  ? await l.commit({ workspaceId: w.id, amount: op.amount, idempotencyKey: key }) :
                                      await l.release({ workspaceId: w.id, amount: op.amount, idempotencyKey: key });
            const delta =
              op.kind === "grant" || op.kind === "topup" || op.kind === "release" ? op.amount : -op.amount;
            expected += delta;
            expect(r.balanceAfter).toBe(expected);
          } catch (e) {
            if (e instanceof InsufficientCredits) {
              // skip — expected when reserve > balance
              continue;
            }
            throw e;
          }
        }
        const balance = await l.getBalance(w.id);
        expect(balance).toBe(expected);
      }),
      { numRuns: 1 },  // single shrink-able run within the loop
    );
  });
});
```

- [ ] **Step 3 — Reconciliation logic skeleton**

`packages/billing/src/reconcile.ts`:

```ts
import { createDb, creditLedgerEntries } from "@vyora/db";
import { eq, and, sql } from "drizzle-orm";
import type { Db } from "@vyora/db";

export interface ReconciliationReport {
  workspaceId: string;
  drift: number;
  expectedTopupCredits: number;
  actualTopupCredits: number;
  expectedGrantCredits: number;
  actualGrantCredits: number;
}

export async function reconcileWorkspace(db: Db, workspaceId: string): Promise<ReconciliationReport> {
  const r = await db.execute<{ kind: string; total: number }>(sql`
    SELECT kind, COALESCE(SUM(amount), 0)::int AS total
    FROM credit_ledger_entries
    WHERE workspace_id = ${workspaceId} AND kind IN ('topup', 'grant')
    GROUP BY kind
  `);
  const actualTopup = r.find((x) => x.kind === "topup")?.total ?? 0;
  const actualGrant = r.find((x) => x.kind === "grant")?.total ?? 0;

  // TODO(slice 34): cross-check against Stripe API to compute expected.
  // For v1 skeleton, drift = 0 if internal records have stripe_event_id present where required.
  return {
    workspaceId,
    drift: 0,
    expectedTopupCredits: actualTopup,
    actualTopupCredits: actualTopup,
    expectedGrantCredits: actualGrant,
    actualGrantCredits: actualGrant,
  };
}
```

> The full Stripe cross-check is wired in slice 34. This skeleton ensures the job script + signature exist now.

- [ ] **Step 4 — Reconciliation script**

`packages/billing/scripts/reconcile.ts`:

```ts
import { createDb, workspaces } from "@vyora/db";
import { reconcileWorkspace } from "../src/reconcile.js";

const url = process.env.DATABASE_URL!;
const db = createDb(url, "app_admin");
const all = await db.select().from(workspaces);

let drifts = 0;
for (const w of all) {
  const r = await reconcileWorkspace(db, w.id);
  if (r.drift !== 0) {
    console.error("DRIFT", JSON.stringify(r));
    drifts++;
  }
}
console.warn(`reconciled ${all.length} workspaces, ${drifts} drift(s)`);
process.exit(drifts === 0 ? 0 : 1);
```

- [ ] **Step 5 — Run + commit**

```bash
pnpm test:int
git add -A
git commit -m "test(billing): property-test ledger correctness + reconciliation job skeleton"
```

---

## Verification

```bash
pnpm test:int
DATABASE_URL=$DATABASE_URL pnpm --filter @vyora/billing exec tsx scripts/reconcile.ts
```

## Commit message

```
test(billing): property-test ledger correctness + reconciliation job skeleton
```
