import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FluxImageProvider } from "./flux.js";

const fetchMock = vi.fn();

describe("FluxImageProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts to Replicate and downloads result", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "succeeded", output: "https://cdn/img.png" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47]), { status: 200 }),
      );

    const storage = { getSignedUrl: vi.fn(async () => "https://s/x") } as never;
    const p = new FluxImageProvider({ replicateToken: "t", storage });
    const r = await p.generate({
      modelCode: "flux-1.1-pro",
      prompt: "hi",
      aspectRatio: "1:1",
      width: 1024,
      height: 1024,
      safetyLevel: "default",
    });
    expect(r.modelUsedCode).toBe("flux-1.1-pro");
    expect(r.imageBytes.byteLength).toBeGreaterThan(0);
  });

  it("throws when Replicate returns error status", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "failed", error: "out of credits" }), { status: 200 }),
    );

    const storage = { getSignedUrl: vi.fn(async () => "https://s/x") } as never;
    const p = new FluxImageProvider({ replicateToken: "t", storage });
    await expect(
      p.generate({
        modelCode: "flux-1.1-pro",
        prompt: "hi",
        aspectRatio: "1:1",
        width: 1024,
        height: 1024,
        safetyLevel: "default",
      }),
    ).rejects.toThrow(/flux-status-failed/);
  });
});
