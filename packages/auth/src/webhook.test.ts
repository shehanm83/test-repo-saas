import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(() => ({})),
  bootstrapNewUser: vi.fn(async () => ({ userId: "u_1", workspaceId: "w_1" })),
  softDeleteWorkspaceForUser: vi.fn(async () => undefined),
  verify: vi.fn<(rawBody: string, headers: Record<string, string>) => unknown>(),
}));

vi.mock("@layertone/db", () => ({
  createDb: mocks.createDb,
}));

vi.mock("@layertone/db/queries/identity", () => ({
  bootstrapNewUser: mocks.bootstrapNewUser,
  softDeleteWorkspaceForUser: mocks.softDeleteWorkspaceForUser,
}));

vi.mock("svix", () => ({
  Webhook: class {
    verify(rawBody: string, headers: Record<string, string>) {
      return mocks.verify(rawBody, headers);
    }
  },
}));

import { ClerkWebhookHandler } from "./webhook";

const config = {
  auth: {
    mode: "clerk" as const,
    publishableKey: "pk_test",
    secretKey: "sk_test",
    webhookSecret: "whsec_test",
  },
  db: { url: "postgres://example.test/layertone" },
};

describe("ClerkWebhookHandler", () => {
  it("handles user.created", async () => {
    mocks.verify.mockReturnValueOnce({
      id: "evt_1",
      type: "user.created",
      data: {
        id: "user_clerk_1",
        email_addresses: [{ email_address: "person@example.com" }],
      },
    });

    const result = await new ClerkWebhookHandler(config).handle("{}", new Headers());

    expect(result).toEqual({
      status: 200,
      body: { userId: "u_1", workspaceId: "w_1" },
    });
    expect(mocks.createDb).toHaveBeenCalledWith("postgres://example.test/layertone", "app_admin");
    expect(mocks.bootstrapNewUser).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        clerkUserId: "user_clerk_1",
        email: "person@example.com",
        eventId: "evt_1",
      }),
    );
  });

  it("handles user.deleted", async () => {
    mocks.verify.mockReturnValueOnce({
      id: "evt_2",
      type: "user.deleted",
      data: { id: "user_clerk_2" },
    });

    const result = await new ClerkWebhookHandler(config).handle("{}", new Headers());

    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(mocks.softDeleteWorkspaceForUser).toHaveBeenCalledWith({}, "user_clerk_2");
  });

  it("returns idempotent result when bootstrap already happened", async () => {
    mocks.bootstrapNewUser.mockResolvedValueOnce({ idempotent: true } as never);
    mocks.verify.mockReturnValueOnce({
      id: "evt_3",
      type: "user.created",
      data: {
        id: "user_clerk_3",
        email_addresses: [{ email_address: "again@example.com" }],
      },
    });

    const result = await new ClerkWebhookHandler(config).handle("{}", new Headers());

    expect(result).toEqual({ status: 200, body: { idempotent: true } });
  });

  it("rejects invalid signatures", async () => {
    mocks.verify.mockImplementationOnce(() => {
      throw new Error("bad signature");
    });

    const result = await new ClerkWebhookHandler(config).handle("{}", new Headers());

    expect(result).toEqual({ status: 400, body: { error: "invalid-signature" } });
  });
});
