import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { OpenAIImageProvider } from "./openai-image.js";

vi.mock("openai", () => {
  const mockGenerate = vi.fn();
  const mockEdit = vi.fn();
  class MockOpenAI {
    images = { generate: mockGenerate, edit: mockEdit };
  }
  return {
    default: MockOpenAI,
    __mockGenerate: mockGenerate,
    __mockEdit: mockEdit,
  };
});

describe("OpenAIImageProvider", () => {
  afterEach(() => vi.clearAllMocks());

  it("generates image without references", async () => {
    const { __mockGenerate } = await import("openai") as unknown as { __mockGenerate: ReturnType<typeof vi.fn> };
    __mockGenerate.mockResolvedValueOnce({ data: [{ b64_json: Buffer.from([0x89, 0x50]).toString("base64") }] });

    const storage = { getBytes: vi.fn() } as never;
    const p = new OpenAIImageProvider({ apiKey: "k", storage });
    const r = await p.generate({
      modelCode: "gpt-image-1",
      prompt: "hello",
      aspectRatio: "1:1",
      width: 1024,
      height: 1024,
      safetyLevel: "default",
    });
    expect(r.modelUsedCode).toBe("gpt-image-1");
    expect(r.imageBytes.byteLength).toBeGreaterThan(0);
  });

  it("uses edit endpoint when references provided", async () => {
    const { __mockEdit } = await import("openai") as unknown as { __mockEdit: ReturnType<typeof vi.fn> };
    __mockEdit.mockResolvedValueOnce({ data: [{ b64_json: Buffer.from([0x01, 0x02]).toString("base64") }] });

    const storage = { getBytes: vi.fn(async () => new Uint8Array([1, 2, 3])) } as never;
    const p = new OpenAIImageProvider({ apiKey: "k", storage });
    const r = await p.generate({
      modelCode: "gpt-image-1",
      prompt: "hello",
      aspectRatio: "1:1",
      width: 1024,
      height: 1024,
      safetyLevel: "default",
      references: [{ s3Key: "ref.png", role: "inspiration", weight: 0.5 }],
    });
    expect(r.modelUsedCode).toBe("gpt-image-1");
    expect(__mockEdit).toHaveBeenCalledOnce();
  });
});
