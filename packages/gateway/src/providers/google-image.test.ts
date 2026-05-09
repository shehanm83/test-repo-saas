import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GoogleImageProvider } from "./google-image.js";

const fetchMock = vi.fn();

function mkProvider() {
  const storage = { getBytes: vi.fn(async () => new Uint8Array([1, 2, 3])) } as never;
  return new GoogleImageProvider({ apiKey: "GKEY", storage });
}

describe("GoogleImageProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("calls Gemini generateContent for nano-banana and decodes inlineData base64", async () => {
    const b64 = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ inlineData: { mimeType: "image/png", data: b64 } }] },
              finishReason: "STOP",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const r = await mkProvider().generate({
      modelCode: "nano-banana",
      prompt: "a cat",
      aspectRatio: "1:1",
      width: 1024,
      height: 1024,
      safetyLevel: "default",
    });
    expect(r.modelUsedCode).toBe("nano-banana");
    expect(r.imageBytes.byteLength).toBeGreaterThan(0);

    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toContain("/v1beta/models/gemini-2.5-flash-image:generateContent");
    expect(call[0]).toContain("key=GKEY");
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.generationConfig.responseModalities).toEqual(["IMAGE"]);
    expect(body.generationConfig.responseFormat.image.aspectRatio).toBe("1:1");
    expect(body.generationConfig.responseFormat.image.imageSize).toBe("1K");
  });

  it("routes nano-banana-pro to gemini-3-pro-image-preview and selects 2K when above 1MP", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "AA==" } }] } }],
        }),
        { status: 200 },
      ),
    );

    await mkProvider().generate({
      modelCode: "nano-banana-pro",
      prompt: "x",
      aspectRatio: "1:1",
      width: 1408,
      height: 1408,
      safetyLevel: "default",
    });
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toContain("/v1beta/models/gemini-3-pro-image-preview:generateContent");
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.generationConfig.responseFormat.image.imageSize).toBe("2K");
  });

  it("selects 4K imageSize for nano-banana-pro at 4MP+", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "AA==" } }] } }],
        }),
        { status: 200 },
      ),
    );

    await mkProvider().generate({
      modelCode: "nano-banana-pro",
      prompt: "x",
      aspectRatio: "1:1",
      width: 2048,
      height: 2048,
      safetyLevel: "default",
    });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.generationConfig.responseFormat.image.imageSize).toBe("4K");
  });

  it("attaches reference images as inline base64 parts", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "AA==" } }] } }],
        }),
        { status: 200 },
      ),
    );

    await mkProvider().generate({
      modelCode: "nano-banana",
      prompt: "edit this",
      references: [{ s3Key: "ref/1.png", role: "inspiration", weight: 0.6 }],
      aspectRatio: "1:1",
      width: 1024,
      height: 1024,
      safetyLevel: "default",
    });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.contents[0].parts).toHaveLength(2);
    expect(body.contents[0].parts[1].inlineData.mimeType).toBe("image/png");
  });

  it("throws when the candidate has no image part", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "no image generated" }] }, finishReason: "SAFETY" }],
        }),
        { status: 200 },
      ),
    );
    await expect(
      mkProvider().generate({
        modelCode: "nano-banana",
        prompt: "x",
        aspectRatio: "1:1",
        width: 1024,
        height: 1024,
        safetyLevel: "default",
      }),
    ).rejects.toThrow(/google-image-no-output/);
  });

  it("throws on HTTP error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("forbidden", { status: 403 }));
    await expect(
      mkProvider().generate({
        modelCode: "nano-banana",
        prompt: "x",
        aspectRatio: "1:1",
        width: 1024,
        height: 1024,
        safetyLevel: "default",
      }),
    ).rejects.toThrow(/google-image-status-403/);
  });
});
