import { createDb, users, workspaces } from "@layertone/db";
import { describe, expect, it } from "vitest";

import { Ledger } from "./ledger";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://layertone:dev@localhost:5432/layertone";
const db = createDb(databaseUrl, "app_admin");

async function setup() {
  const [user] = await db
    .insert(users)
    .values({ email: `ledger-${Date.now()}-${Math.random()}@example.test` })
    .returning();
  const [workspace] = await db
    .insert(workspaces)
    .values({ ownerUserId: user!.id, name: `Ledger ${Date.now()}` })
    .returning();
  return { workspaceId: workspace!.id };
}

describe("Ledger", () => {
  it("supports grant, reserve, commit, and release", async () => {
    const { workspaceId } = await setup();
    const ledger = new Ledger(db);

    await ledger.grant({ workspaceId, amount: 50, idempotencyKey: "g1" });
    expect(await ledger.getBalance(workspaceId)).toBe(50);

    await ledger.reserve({ workspaceId, amount: 20, idempotencyKey: "r1" });
    expect(await ledger.getBalance(workspaceId)).toBe(30);

    await ledger.commit({ workspaceId, amount: 10, idempotencyKey: "c1" });
    await ledger.release({ workspaceId, amount: 10, idempotencyKey: "rel1" });

    expect(await ledger.getBalance(workspaceId)).toBe(30);
  });

  it("is idempotent for reused keys", async () => {
    const { workspaceId } = await setup();
    const ledger = new Ledger(db);

    await ledger.grant({ workspaceId, amount: 50, idempotencyKey: "idem-grant" });
    const replay = await ledger.grant({ workspaceId, amount: 50, idempotencyKey: "idem-grant" });

    expect(replay.idempotent).toBe(true);
    expect(await ledger.getBalance(workspaceId)).toBe(50);
  });

  it("rejects negative balances", async () => {
    const { workspaceId } = await setup();
    const ledger = new Ledger(db);

    await ledger.grant({ workspaceId, amount: 10, idempotencyKey: "seed-10" });
    await expect(
      ledger.reserve({ workspaceId, amount: 20, idempotencyKey: "reserve-20" }),
    ).rejects.toThrow(/insufficient/i);
  });

  it("prevents negative balances under parallel reservations", async () => {
    const { workspaceId } = await setup();
    const ledger = new Ledger(db);

    await ledger.grant({ workspaceId, amount: 50, idempotencyKey: "seed-50" });

    const results = await Promise.allSettled(
      Array.from({ length: 100 }, (_, index) =>
        ledger.reserve({ workspaceId, amount: 1, idempotencyKey: `parallel-${index}` }),
      ),
    );

    const successes = results.filter((result) => result.status === "fulfilled").length;
    expect(successes).toBe(50);
    expect(await ledger.getBalance(workspaceId)).toBe(0);
  });
});
