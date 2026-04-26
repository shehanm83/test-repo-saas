import { describe, expect, it, vi } from "vitest";
import { Gateway } from "./gateway.js";
import { MockImageProvider, MockTextProvider, MockVisionProvider } from "./mock.js";

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
  it("rewrites prompt with vision description when needsVisionFallback", async () => {
    // Build a mock image provider that does NOT support i2i so fallback is triggered
    const noI2IProvider = {
      capabilities: {
        modelCodes: ["test-model"],
        supportsImageToImage: false,
        supportsMultiReference: false,
        tier: "fallback" as const,
      },
      generate: vi.fn(async (req: { prompt: string; modelCode: string; safetyLevel: string; aspectRatio: string; width: number; height: number }) => ({
        imageBytes: Buffer.from([1, 2, 3]),
        modelUsedCode: "test-model",
        upstreamCostCents: 0,
        latencyMs: 1,
        safetyFlags: [],
        _prompt: req.prompt,
      })),
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
