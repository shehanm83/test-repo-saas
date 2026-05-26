import type { Config } from "@layertone/shared/config";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setActiveWorkspace: vi.fn(async () => undefined),
  createDb: vi.fn(() => ({})),
  listWorkspacesForUser: vi.fn(async () => [
    { id: "00000000-0000-0000-0000-000000000111", name: "W", role: "owner", planCode: "free" },
  ]),
  switchActiveWorkspace: vi.fn(async () => ({
    workspaceId: "00000000-0000-0000-0000-000000000111",
  })),
  inviteMember: vi.fn(async () => ({ token: "tok_1", userIdKnown: "u_2" })),
  acceptInvite: vi.fn(async () => ({ workspaceId: "00000000-0000-0000-0000-000000000111" })),
  changeRole: vi.fn(async () => undefined),
  revokeMember: vi.fn(async () => undefined),
}));

vi.mock("@layertone/db", () => ({
  createDb: mocks.createDb,
  listWorkspacesForUser: mocks.listWorkspacesForUser,
  switchActiveWorkspace: mocks.switchActiveWorkspace,
  inviteMember: mocks.inviteMember,
  acceptInvite: mocks.acceptInvite,
  changeRole: mocks.changeRole,
  revokeMember: mocks.revokeMember,
}));

vi.mock("@layertone/shared", () => ({
  createAdapters: () => ({
    auth: {
      setActiveWorkspace: mocks.setActiveWorkspace,
    },
  }),
}));

import { WorkspaceApi } from "./workspace";

const config = {
  auth: { mode: "dev" as const, devUserId: "00000000-0000-0000-0000-000000000001" },
  db: { url: "postgres://example.test/layertone" },
  storage: {
    mode: "minio" as const,
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    accessKeyId: "minio",
    secretAccessKey: "minio12345",
    bucketApp: "layertone-app",
    bucketGlobal: "layertone-global",
    cloudfrontDomain: undefined,
  },
  queue: {
    mode: "elasticmq" as const,
    endpoint: "http://localhost:9324",
    region: "us-east-1",
    generationsQueue: "layertone-generations",
    captionsQueue: "layertone-captions",
    dlq: "layertone-generations-dlq",
  },
  billing: {
    mode: "stub" as const,
    stripeSecretKey: undefined,
    webhookSecret: undefined,
    prices: {
      free: undefined,
      subscription: undefined,
      starter: undefined,
      pro: undefined,
      business: undefined,
      agency: undefined,
    },
    topupPrices: {
      p200: undefined,
      p750: undefined,
      p2500: undefined,
    },
  },
  ai: {
    mode: "mock" as const,
    openaiKey: undefined,
    openaiImageModel: "gpt-image-2",
    openaiTextModel: "gpt-5.4-mini",
    anthropicKey: undefined,
    replicateToken: undefined,
    recraftKey: undefined,
    bflKey: undefined,
    bedrockRegion: "us-east-1",
  },
  email: {
    mode: "mailpit" as const,
    resendKey: undefined,
    from: "studio@example.com",
  },
  observability: {
    mode: "none" as const,
    sentryDsn: undefined,
    environment: "local",
  },
  appUrl: "http://localhost:3000",
} satisfies Config;

describe("WorkspaceApi", () => {
  const api = new WorkspaceApi(config);

  it("lists workspaces", async () => {
    await expect(api.list("user_1")).resolves.toHaveLength(1);
  });

  it("switches active workspace through auth provider", async () => {
    const result = await api.switch(
      { workspaceId: "00000000-0000-0000-0000-000000000111" },
      "user_1",
    );

    expect(result).toEqual({ workspaceId: "00000000-0000-0000-0000-000000000111" });
    expect(mocks.setActiveWorkspace).toHaveBeenCalledWith(
      "user_1",
      "00000000-0000-0000-0000-000000000111",
    );
  });

  it("rejects owner role on invite input", async () => {
    await expect(
      api.invite(
        {
          workspaceId: "00000000-0000-0000-0000-000000000111",
          inviteeEmail: "person@example.com",
          role: "owner",
        },
        "user_1",
      ),
    ).rejects.toThrow();
  });

  it("accepts a valid invite token", async () => {
    await expect(api.accept({ token: "tok_1" }, "user_2")).resolves.toEqual({
      workspaceId: "00000000-0000-0000-0000-000000000111",
    });
  });
});
