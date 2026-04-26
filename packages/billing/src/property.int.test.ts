import { createDb, users, workspaces } from "@studio/db";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { InsufficientCredits } from "./errors";
import { Ledger } from "./ledger";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5432/studio";
const db = createDb(databaseUrl, "app_admin");

const operationArb = fc.oneof(
  fc.record({ kind: fc.constant("grant"), amount: fc.integer({ min: 1, max: 100 }) }),
  fc.record({ kind: fc.constant("topup"), amount: fc.integer({ min: 1, max: 100 }) }),
  fc.record({ kind: fc.constant("reserve"), amount: fc.integer({ min: 1, max: 50 }) }),
  fc.record({ kind: fc.constant("commit"), amount: fc.integer({ min: 1, max: 50 }) }),
  fc.record({ kind: fc.constant("release"), amount: fc.integer({ min: 1, max: 50 }) }),
  fc.record({ kind: fc.constant("refund"), amount: fc.integer({ min: 1, max: 50 }) }),
  fc.record({
    kind: fc.constant("adjustment"),
    amount: fc.integer({ min: -50, max: 50 }).filter((n) => n !== 0),
  }),
);

describe("Ledger property test", () => {
  it("sum of postings equals final balance", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: `property-${Date.now()}@example.test` })
      .returning();
    const [workspace] = await db
      .insert(workspaces)
      .values({ ownerUserId: user!.id, name: "Property" })
      .returning();

    const ledger = new Ledger(db);

    await fc.assert(
      fc.asyncProperty(fc.array(operationArb, { minLength: 100, maxLength: 400 }), async (ops) => {
        let expected = 0;
        let index = 0;

        for (const op of ops) {
          const idempotencyKey = `prop-${workspace!.id}-${index++}`;

          try {
            const result =
              op.kind === "grant"
                ? await ledger.grant({
                    workspaceId: workspace!.id,
                    amount: op.amount,
                    idempotencyKey,
                  })
                : op.kind === "topup"
                  ? await ledger.topup({
                      workspaceId: workspace!.id,
                      amount: op.amount,
                      idempotencyKey,
                    })
                  : op.kind === "reserve"
                    ? await ledger.reserve({
                        workspaceId: workspace!.id,
                        amount: op.amount,
                        idempotencyKey,
                      })
                    : op.kind === "commit"
                      ? await ledger.commit({
                          workspaceId: workspace!.id,
                          amount: op.amount,
                          idempotencyKey,
                        })
                      : op.kind === "release"
                        ? await ledger.release({
                            workspaceId: workspace!.id,
                            amount: op.amount,
                            idempotencyKey,
                          })
                        : op.kind === "refund"
                          ? await ledger.refund({
                              workspaceId: workspace!.id,
                              amount: op.amount,
                              idempotencyKey,
                            })
                          : await ledger.adjustment({
                              workspaceId: workspace!.id,
                              amount: op.amount,
                              idempotencyKey,
                            });

            const delta =
              op.kind === "grant" || op.kind === "topup" || op.kind === "release"
                ? op.amount
                : op.kind === "adjustment"
                  ? op.amount
                  : -op.amount;

            expected += delta;
            expect(result.balanceAfter).toBe(expected);
          } catch (error) {
            if (error instanceof InsufficientCredits) {
              continue;
            }
            throw error;
          }
        }

        expect(await ledger.getBalance(workspace!.id)).toBe(expected);
      }),
      { numRuns: 1 },
    );
  });
});
