import { Ledger } from "@studio/billing";
import {
  createDb,
  users,
  workspaces,
  brands,
  templates,
  priceBookEntries,
  generations,
  generationVariants,
  creditLedgerEntries,
} from "@studio/db";
import {
  Gateway,
  MockImageProvider,
  MockTextProvider,
  MockVisionProvider,
  MockModerationProvider,
} from "@studio/gateway";
import type { StorageAdapter, Config } from "@studio/shared";
import { eq } from "drizzle-orm";
import { describe, it, expect, vi, beforeAll } from "vitest";

import { GenerationWorker } from "./handler.js";

vi.mock("@studio/renderer", () => ({
  render: vi.fn().mockResolvedValue({
    pngBytes: Buffer.from("FAKEPNG"),
    renderMs: 5,
  }),
}));

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://studio:dev@localhost:5432/studio";

class MemStorageAdapter implements StorageAdapter {
  private store = new Map<string, Uint8Array>();

  async putBytes(key: string, body: Uint8Array): Promise<void> {
    this.store.set(key, body);
  }
  async getBytes(key: string): Promise<Uint8Array> {
    return this.store.get(key) ?? new Uint8Array();
  }
  async putSignedUrl(_key: string, _ct: string) {
    return {
      url: "http://localhost/upload",
      fields: {} as Record<string, string>,
      expiresAt: new Date(),
    };
  }
  async getSignedUrl(_key: string): Promise<string> {
    return "http://localhost/get";
  }
  async delete(_key: string): Promise<void> {}
  async copy(_src: string, _dst: string): Promise<void> {}
  async exists(_key: string): Promise<boolean> {
    return false;
  }
}

const MINIMAL_JSX = `
function template(input) {
  return h("div", {
    style: { width: "100%", height: "100%", background: "#111", display: "flex" },
  }, h("p", { style: { color: "#fff", fontSize: 20 } }, input.slots.headline));
}
`;

const FAKE_CONFIG: Config = {
  appUrl: "http://localhost:3000",
  db: { url: DATABASE_URL },
  auth: { mode: "dev", devUserId: "00000000-0000-0000-0000-000000000001" },
  storage: {
    mode: "minio",
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin",
    bucketApp: "studio-app",
    bucketGlobal: "studio-global",
    cloudfrontDomain: undefined,
  },
  queue: {
    mode: "inline",
    endpoint: undefined,
    region: "us-east-1",
    generationsQueue: "http://localhost/gen",
    captionsQueue: "http://localhost/cap",
    dlq: "http://localhost/dlq",
  },
  billing: {
    mode: "stub",
    stripeSecretKey: undefined,
    webhookSecret: undefined,
    prices: {
      free: undefined,
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
    mode: "mock",
    openaiKey: undefined,
    anthropicKey: undefined,
    replicateToken: undefined,
    recraftKey: undefined,
    bflKey: undefined,
    bedrockRegion: "us-east-1",
  },
  email: { mode: "console", resendKey: undefined, from: "test@example.com" },
  observability: { mode: "none", sentryDsn: undefined, environment: "test" },
};

function buildMockGateway(): Gateway {
  const gw = new Gateway();
  const img = new MockImageProvider();
  const txt = new MockTextProvider();
  const vis = new MockVisionProvider();
  const mod = new MockModerationProvider();
  gw.registerImage(img);
  gw.setText(txt);
  gw.setVision(vis);
  gw.setModeration(mod);
  return gw;
}

describe("GenerationWorker.handle", () => {
  let adminDb: ReturnType<typeof createDb>;
  let workspaceId: string;
  let brandId: string;
  let templateId: string;
  let userId: string;

  beforeAll(async () => {
    adminDb = createDb(DATABASE_URL, "app_admin");

    // Seed user + workspace
    const [user] = await adminDb
      .insert(users)
      .values({ email: `worker-test-${Date.now()}@example.test` })
      .returning();
    userId = user!.id;

    const [ws] = await adminDb
      .insert(workspaces)
      .values({ ownerUserId: userId, name: `Worker Test ${Date.now()}` })
      .returning();
    workspaceId = ws!.id;

    // Seed brand
    const [brand] = await adminDb
      .insert(brands)
      .values({ workspaceId, name: "Test Brand" })
      .returning();
    brandId = brand!.id;

    // Seed template
    const [tpl] = await adminDb
      .insert(templates)
      .values({
        slug: `worker-tpl-${Date.now()}`,
        name: "Test Template",
        jsxSource: MINIMAL_JSX,
        slots: [],
        textSafeZones: [],
        preferredModel: "flux-1.1-pro",
        supportedAspectRatios: ["1:1"],
        status: "published",
        requiresBrowserRender: false,
      })
      .returning();
    templateId = tpl!.id;

    // Seed pricebook entry
    await adminDb.insert(priceBookEntries).values({
      modelCode: "flux-1.1-pro",
      sizeBucket: "standard",
      premiumFlag: false,
      hasInspirationFlag: false,
      credits: 10,
      version: 1,
    });

    // Grant credits to workspace so reserve succeeds
    const ledger = new Ledger(adminDb);
    await ledger.grant({
      workspaceId,
      amount: 500,
      idempotencyKey: `worker-test-grant-${workspaceId}`,
    });
  });

  it("happy path: processes variant → completed, generation fan-in completes", async () => {
    // Insert generation + variant directly
    const [gen] = await adminDb
      .insert(generations)
      .values({
        workspaceId,
        brandId,
        brief: "A minimalist product photo on white background",
        settings: {
          output_target: { aspectRatio: "1:1", width: 1080, height: 1080 },
        },
        priceBookVersion: 1,
        requestedByUserId: userId,
        status: "pending",
      })
      .returning();

    const [variant] = await adminDb
      .insert(generationVariants)
      .values({
        generationId: gen!.id,
        templateId,
        creditCost: 10,
        status: "queued",
      })
      .returning();

    // Reserve credits (simulate what GenerationApi does)
    const ledger = new Ledger(adminDb);
    await ledger.reserve({
      workspaceId,
      amount: 10,
      idempotencyKey: `reserve-${variant!.id}`,
      generationId: gen!.id,
    });

    const worker = new GenerationWorker(FAKE_CONFIG, {
      ai: buildMockGateway() as never,
      storage: new MemStorageAdapter(),
    } as never);

    await worker.handle({
      generationId: gen!.id,
      variantId: variant!.id,
      workspaceId,
    });

    // Variant should be completed
    const [updatedVariant] = await adminDb
      .select()
      .from(generationVariants)
      .where(eq(generationVariants.id, variant!.id));
    expect(updatedVariant?.status).toBe("completed");
    expect(updatedVariant?.outputS3Key).toBeTruthy();

    // Generation should be completed (fan-in)
    const [updatedGen] = await adminDb
      .select()
      .from(generations)
      .where(eq(generations.id, gen!.id));
    expect(updatedGen?.status).toBe("completed");

    // Commit ledger entry should exist
    const commits = await adminDb
      .select()
      .from(creditLedgerEntries)
      .where(eq(creditLedgerEntries.idempotencyKey, `commit-${variant!.id}`));
    expect(commits).toHaveLength(1);
    expect(commits[0]?.kind).toBe("commit");
  });

  it("idempotent: already completed variant is skipped", async () => {
    const [gen] = await adminDb
      .insert(generations)
      .values({
        workspaceId,
        brandId,
        brief: "Idem test brief",
        settings: {
          output_target: { aspectRatio: "1:1", width: 1080, height: 1080 },
        },
        priceBookVersion: 1,
        requestedByUserId: userId,
        status: "completed",
      })
      .returning();

    const [variant] = await adminDb
      .insert(generationVariants)
      .values({
        generationId: gen!.id,
        templateId,
        creditCost: 10,
        status: "completed",
      })
      .returning();

    const worker = new GenerationWorker(FAKE_CONFIG, {
      ai: buildMockGateway() as never,
      storage: new MemStorageAdapter(),
    } as never);

    // Should not throw — simply returns early
    await expect(
      worker.handle({
        generationId: gen!.id,
        variantId: variant!.id,
        workspaceId,
      }),
    ).resolves.toBeUndefined();

    // Status unchanged
    const [v] = await adminDb
      .select()
      .from(generationVariants)
      .where(eq(generationVariants.id, variant!.id));
    expect(v?.status).toBe("completed");
  });
});
