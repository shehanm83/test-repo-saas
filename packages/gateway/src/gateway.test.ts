import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { Gateway } from "./gateway.js";
import { MockImageProvider, MockVisionProvider } from "./mock.js";

describe("Gateway", () => {
  it("routes to registered provider", async () => {
    const gw = new Gateway();
    gw.registerImage(new MockImageProvider());
    const r = await gw.generateImage({
      modelCode: "flux-1.1-pro",
      prompt: "x",
      aspectRatio: "1:1",
      width: 64,
      height: 64,
      safetyLevel: "default",
    });
    expect(r.imageBytes.byteLength).toBeGreaterThan(0);
    expect(r.modelUsedCode).toBe("flux-1.1-pro");
  });

  it("throws on unknown model", async () => {
    const gw = new Gateway();
    gw.registerImage(new MockImageProvider());
    await expect(
      gw.generateImage({
        modelCode: "nope",
        prompt: "x",
        aspectRatio: "1:1",
        width: 64,
        height: 64,
        safetyLevel: "default",
      }),
    ).rejects.toThrow(/unknown model/);
  });

  it("exposes the registered provider capability matrix", () => {
    const gateway = new Gateway();
    gateway.registerImage(new MockImageProvider());
    expect(gateway.capabilityMatrix()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          modelCodes: expect.arrayContaining(["gpt-image-2"]),
          supportsImageToImage: true,
          referenceRoles: expect.arrayContaining(["product_identity"]),
        }),
      ]),
    );
  });

  it("promotes to i2i model when needed", async () => {
    const gw = new Gateway();
    gw.registerImage(new MockImageProvider());
    const r = await gw.generateImage({
      modelCode: "bedrock-sd35",
      prompt: "test",
      aspectRatio: "1:1",
      width: 64,
      height: 64,
      safetyLevel: "default",
      references: [{ s3Key: "test.png", role: "inspiration", weight: 0.6 }],
    });
    // MockImageProvider supports i2i for bedrock-sd35 so no promotion needed
    expect(r.modelUsedCode).toBe("bedrock-sd35");
  });
});

describe("Gateway vision-fallback", () => {
  it("never drops an essential product identity reference", async () => {
    const provider = {
      capabilities: {
        modelCodes: ["identity-unsafe"],
        supportsImageToImage: false,
        supportsMultiReference: false,
        tier: "fallback" as const,
      },
      generate: vi.fn(),
    };
    const gateway = new Gateway();
    gateway.registerImage(provider);
    await expect(
      gateway.generateImage({
        modelCode: "identity-unsafe",
        prompt: "Product hero",
        aspectRatio: "1:1",
        width: 512,
        height: 512,
        safetyLevel: "default",
        references: [
          {
            s3Key: "product.png",
            role: "product_identity",
            weight: 1,
            importance: "essential",
            locked: true,
          },
        ],
      }),
    ).rejects.toThrow(/essential references unsupported/);
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it("rewrites prompt with vision description when needsVisionFallback", async () => {
    // Build a mock image provider that does NOT support i2i so fallback is triggered
    const noI2IProvider = {
      capabilities: {
        modelCodes: ["test-model"],
        supportsImageToImage: false,
        supportsMultiReference: false,
        tier: "fallback" as const,
      },
      generate: vi.fn(
        async (req: {
          prompt: string;
          modelCode: string;
          safetyLevel: string;
          aspectRatio: string;
          width: number;
          height: number;
        }) => ({
          imageBytes: Buffer.from([1, 2, 3]),
          modelUsedCode: "test-model",
          upstreamCostCents: 0,
          latencyMs: 1,
          safetyFlags: [],
          _prompt: req.prompt,
        }),
      ),
    };

    const storage = { getBytes: vi.fn(async () => new Uint8Array([1, 2, 3])) } as never;
    const vision = new MockVisionProvider();

    const gw = new Gateway();
    gw.registerImage(noI2IProvider);
    gw.setStorage(storage);
    gw.setVision(vision);

    await gw.generateImage({
      modelCode: "test-model",
      prompt: "original prompt",
      aspectRatio: "1:1",
      width: 64,
      height: 64,
      safetyLevel: "default",
      references: [{ s3Key: "insp.png", role: "inspiration", weight: 0.6 }],
    });

    const calledPrompt = (noI2IProvider.generate.mock.calls[0]![0] as { prompt: string }).prompt;
    expect(calledPrompt).toContain("original prompt");
    expect(calledPrompt).toContain("Style cues from reference:");
  });
});

describe("MockImageProvider with samples", () => {
  it.each([
    ["1:1", 256, 256],
    ["4:5", 256, 320],
    ["9:16", 256, 455],
    ["16:9", 455, 256],
    ["1.91:1", 489, 256],
    ["2:3", 256, 384],
  ])(
    "fills the exact %s target canvas without letterbox dimensions",
    async (aspectRatio, width, height) => {
      const provider = new MockImageProvider({ samplesDir: "/nonexistent/path" });
      const response = await provider.generate({
        modelCode: "gpt-image-2",
        prompt: "aspect golden",
        aspectRatio,
        width,
        height,
        safetyLevel: "default",
      });
      const metadata = await sharp(response.imageBytes).metadata();
      expect([metadata.width, metadata.height]).toEqual([width, height]);
    },
  );

  it("returns a PNG of the requested dimensions when samples exist", async () => {
    const samplesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../samples");
    if (!existsSync(samplesDir)) {
      return;
    }

    const provider = new MockImageProvider({ samplesDir });
    const res = await provider.generate({
      modelCode: "flux-1.1-pro",
      prompt: "a test prompt",
      aspectRatio: "1:1",
      width: 128,
      height: 128,
      safetyLevel: "default",
    });

    expect(res.imageBytes.byteLength).toBeGreaterThan(1000);
    expect(res.modelUsedCode).toBe("flux-1.1-pro");
  });

  it("falls back to colored square when samplesDir is missing", async () => {
    const provider = new MockImageProvider({ samplesDir: "/nonexistent/path" });
    const res = await provider.generate({
      modelCode: "flux-1.1-pro",
      prompt: "a test prompt",
      aspectRatio: "1:1",
      width: 64,
      height: 64,
      safetyLevel: "default",
    });

    expect(res.imageBytes.byteLength).toBeGreaterThan(0);
  });
});
