import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn(() => ({
    catch: vi.fn(async () => undefined),
  })),
};
vi.mock("@vyora/db", () => ({
  staffUsers: { username: { name: "username" }, id: { name: "id" } },
  eq: vi.fn(),
  sql: vi.fn(),
}));

import { hashStaffPassword, verifyStaffBasicAuth, verifyStaffCredentials } from "./staff";

function dbWith(row: { id: string; username: string; passwordHash: string } | null) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (row ? [row] : []),
        }),
      }),
    }),
    update: () => mockUpdateChain,
  } as never;
}

beforeEach(() => {
  mockSelect.mockReset();
  mockUpdateChain.set.mockClear();
});

describe("hashStaffPassword + verifyStaffCredentials", () => {
  it("round-trips: hashing a password then checking it returns the staff identity", async () => {
    const hash = await hashStaffPassword("hunter2");
    const db = dbWith({ id: "s1", username: "alice", passwordHash: hash });
    const r = await verifyStaffCredentials(db, "alice", "hunter2");
    expect(r).toEqual({ id: "s1", username: "alice" });
  });

  it("returns null on wrong password", async () => {
    const hash = await hashStaffPassword("hunter2");
    const db = dbWith({ id: "s1", username: "alice", passwordHash: hash });
    expect(await verifyStaffCredentials(db, "alice", "wrong")).toBeNull();
  });

  it("returns null on unknown username (without leaking via timing — comparison still happens)", async () => {
    const db = dbWith(null);
    expect(await verifyStaffCredentials(db, "ghost", "anything")).toBeNull();
  });
});

describe("verifyStaffBasicAuth", () => {
  it("rejects missing or non-Basic Authorization headers", async () => {
    const db = dbWith({ id: "s1", username: "a", passwordHash: "x" });
    expect(await verifyStaffBasicAuth(db, null)).toBeNull();
    expect(await verifyStaffBasicAuth(db, "Bearer abc")).toBeNull();
    expect(await verifyStaffBasicAuth(db, "Basic")).toBeNull();
  });

  it("accepts a properly formed Basic header with valid creds", async () => {
    const hash = await hashStaffPassword("p");
    const db = dbWith({ id: "s1", username: "u", passwordHash: hash });
    const header = "Basic " + Buffer.from("u:p").toString("base64");
    const r = await verifyStaffBasicAuth(db, header);
    expect(r).toEqual({ id: "s1", username: "u" });
  });

  it("rejects malformed Basic payloads", async () => {
    const db = dbWith({ id: "s1", username: "u", passwordHash: "x" });
    // Missing the colon entirely.
    const header = "Basic " + Buffer.from("nocolon").toString("base64");
    expect(await verifyStaffBasicAuth(db, header)).toBeNull();
  });
});
