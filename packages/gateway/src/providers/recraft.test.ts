import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { RecraftImageProvider } from "./recraft.js";

const fetchMock = vi.fn();

describe("RecraftImageProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("calls Recraft API and downloads result", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ url: "https://cdn/img.png" }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47]), { status: 200 }),
      );

    const storage = { getSignedUrl: vi.fn() } as never;
    const p = new RecraftImageProvider({ apiKey: "k", storage });
    const r = await p.generate({
      modelCode: "recraft-v3",
      prompt: "test",
      aspectRatio: "1:1",
      width: 1024,
      height: 1024,
      safetyLevel: "default",
    });
    expect(r.modelUsedCode).toBe("recraft-v3");
    expect(r.imageBytes.byteLength).toBeGreaterThan(0);
  });

  it("throws when API returns error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("bad", { status: 401 }));

    const storage = { getSignedUrl: vi.fn() } as never;
    const p = new RecraftImageProvider({ apiKey: "k", storage });
    await expect(
      p.generate({ modelCode: "recraft-v3", prompt: "test", aspectRatio: "1:1", width: 512, height: 512, safetyLevel: "default" }),
    ).rejects.toThrow(/recraft-status-401/);
  });
});
