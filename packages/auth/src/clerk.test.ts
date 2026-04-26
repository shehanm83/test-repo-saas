import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({
    users: {
      updateUserMetadata: vi.fn().mockResolvedValue({}),
    },
  })),
  verifyToken: vi.fn(async (token: string) => {
    if (token === "good") {
      return { sub: "u_1", current_workspace_id: "w_1", role: "user" };
    }

    if (token === "admin") {
      return { sub: "u_admin", role: "admin" };
    }

    throw new Error("bad token");
  }),
}));

import { ClerkAuthProvider } from "./clerk";

describe("ClerkAuthProvider", () => {
  const provider = new ClerkAuthProvider({ publishableKey: "pk", secretKey: "sk" });

  it("verifies a good token and extracts workspace_id", async () => {
    const id = await provider.verifyRequest(new Headers({ authorization: "Bearer good" }));

    expect(id?.userId).toBe("u_1");
    expect(id?.workspaceId).toBe("w_1");
    expect(id?.role).toBe("user");
  });

  it("returns null for bad token", async () => {
    const id = await provider.verifyRequest(new Headers({ authorization: "Bearer bad" }));

    expect(id).toBeNull();
  });

  it("recognizes admin role", async () => {
    const id = await provider.verifyRequest(new Headers({ authorization: "Bearer admin" }));

    expect(id?.role).toBe("admin");
  });
});
