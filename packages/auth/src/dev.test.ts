import { describe, expect, it } from "vitest";

import { DevAuthProvider } from "./dev";

describe("DevAuthProvider", () => {
  const provider = new DevAuthProvider("00000000-0000-0000-0000-000000000001");

  it("returns dev user when no header overrides", async () => {
    const id = await provider.verifyRequest(new Headers());

    expect(id?.userId).toBe("00000000-0000-0000-0000-000000000001");
    expect(id?.role).toBe("user");
  });

  it("respects x-dev-user-id override", async () => {
    const id = await provider.verifyRequest(new Headers({ "x-dev-user-id": "abc" }));

    expect(id?.userId).toBe("abc");
  });

  it("respects x-dev-role admin", async () => {
    const id = await provider.verifyRequest(new Headers({ "x-dev-role": "admin" }));

    expect(id?.role).toBe("admin");
  });
});
