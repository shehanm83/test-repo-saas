import { describe, expect, it, vi } from "vitest";

import { reconcileWorkspace } from "./reconcile.js";

describe("reconcileWorkspace", () => {
  it("returns drift=0 when there are no ledger entries", async () => {
    const db = {
      execute: vi.fn(async () => []),
    } as never;
    const r = await reconcileWorkspace(db, "w1");
    expect(r.drift).toBe(0);
    expect(r.actualGrantCredits).toBe(0);
    expect(r.actualTopupCredits).toBe(0);
  });

  it("returns drift=0 when ledger matches expected (no external cross-check)", async () => {
    const db = {
      execute: vi.fn(async () => [
        { kind: "grant", total: 250 },
        { kind: "topup", total: 100 },
      ]),
    } as never;
    const r = await reconcileWorkspace(db, "w1");
    expect(r.drift).toBe(0);
    expect(r.actualGrantCredits).toBe(250);
    expect(r.actualTopupCredits).toBe(100);
  });

  it("returns the correct workspace id", async () => {
    const db = { execute: vi.fn(async () => []) } as never;
    const r = await reconcileWorkspace(db, "workspace-xyz");
    expect(r.workspaceId).toBe("workspace-xyz");
  });
});
