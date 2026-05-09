import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { BFLImageProvider } from "./bfl.js";

const fetchMock = vi.fn();

function mkProvider() {
  const storage = { getBytes: vi.fn(async () => new Uint8Array([1, 2, 3])) } as never;
  return new BFLImageProvider({ apiKey: "k", storage });
}

describe("BFLImageProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts to flux-pro-1.1 then polls until Ready and returns bytes", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: "j1", polling_url: "https://api.bfl.ai/v1/get_result?id=j1" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "Pending" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: "Ready", result: { sample: "https://cdn/img.png" } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47]), { status: 200 }));

    const r = await mkProvider().generate({
      modelCode: "photoreal-pro",
      prompt: "a sunset",
      aspectRatio: "1:1",
      width: 1024,
      height: 1024,
      safetyLevel: "default",
    });

    expect(r.modelUsedCode).toBe("photoreal-pro");
    expect(r.imageBytes.byteLength).toBeGreaterThan(0);

    const created = fetchMock.mock.calls[0]!;
    expect(created[0]).toBe("https://api.bfl.ai/v1/flux-pro-1.1");
    const reqInit = created[1] as RequestInit;
    expect(reqInit.method).toBe("POST");
    expect((reqInit.headers as Record<string, string>)["x-key"]).toBe("k");
    const body = JSON.parse(reqInit.body as string);
    expect(body).toMatchObject({ prompt: "a sunset", width: 1024, height: 1024, output_format: "png" });
  });

  it("routes photoreal-ultra to flux-pro-1.1-ultra", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "j2", polling_url: "https://api.bfl.ai/v1/get_result?id=j2" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "Ready", result: { sample: "https://cdn/u.png" } }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(Buffer.from([0x89]), { status: 200 }));

    await mkProvider().generate({
      modelCode: "photoreal-ultra",
      prompt: "x",
      aspectRatio: "1:1",
      width: 2048,
      height: 2048,
      safetyLevel: "default",
    });
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.bfl.ai/v1/flux-pro-1.1-ultra");
  });

  it("snaps non-multiple-of-32 width/height onto the BFL grid", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "j3", polling_url: "https://api.bfl.ai/v1/get_result?id=j3" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "Ready", result: { sample: "https://cdn/x.png" } }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(Buffer.from([0x89]), { status: 200 }));

    await mkProvider().generate({
      modelCode: "photoreal-pro",
      prompt: "x",
      aspectRatio: "1:1",
      // 1535 → not a multiple of 32 and over the 1440 max for non-ultra; should snap to 1440.
      width: 1535,
      height: 1037,
      safetyLevel: "default",
    });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.width).toBe(1440);
    expect(body.height % 32).toBe(0);
    expect(body.height).toBeLessThanOrEqual(1440);
  });

  it("throws on Error / Failed terminal status", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "j4", polling_url: "https://api.bfl.ai/v1/get_result?id=j4" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "Error", result: {} }), { status: 200 }),
      );
    await expect(
      mkProvider().generate({
        modelCode: "photoreal-pro",
        prompt: "x",
        aspectRatio: "1:1",
        width: 1024,
        height: 1024,
        safetyLevel: "default",
      }),
    ).rejects.toThrow(/bfl-job-error/);
  });

  it("rejects unknown model codes", async () => {
    await expect(
      mkProvider().generate({
        modelCode: "not-a-real-thing",
        prompt: "x",
        aspectRatio: "1:1",
        width: 1024,
        height: 1024,
        safetyLevel: "default",
      }),
    ).rejects.toThrow(/bfl-unknown-model/);
  });
});
