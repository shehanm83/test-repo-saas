import { describe, expect, it, vi, afterEach } from "vitest";
import { OpenAITextProvider } from "./openai-text.js";

vi.mock("openai", () => {
  const mockCreate = vi.fn();
  const mockEmbed = vi.fn();
  class MockOpenAI {
    responses = { create: mockCreate };
    embeddings = { create: mockEmbed };
  }
  return {
    default: MockOpenAI,
    __mockCreate: mockCreate,
    __mockEmbed: mockEmbed,
  };
});

describe("OpenAITextProvider", () => {
  afterEach(() => vi.clearAllMocks());

  it("generates text through responses api", async () => {
    const { __mockCreate } = (await import("openai")) as unknown as {
      __mockCreate: ReturnType<typeof vi.fn>;
    };
    __mockCreate.mockResolvedValueOnce({ output_text: "A useful caption." });

    const p = new OpenAITextProvider({ apiKey: "k", model: "gpt-5.4-mini" });
    const r = await p.generate({
      modelCode: "gpt-5.4-mini",
      systemPrompt: "Write captions.",
      prompt: "Brief",
      maxTokens: 80,
    });

    expect(r.text).toBe("A useful caption.");
    expect(__mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.4-mini",
        instructions: "Write captions.",
        input: "Brief",
        max_output_tokens: 80,
      }),
    );
  });

  it("creates embeddings", async () => {
    const { __mockEmbed } = (await import("openai")) as unknown as {
      __mockEmbed: ReturnType<typeof vi.fn>;
    };
    __mockEmbed.mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2] }] });

    const p = new OpenAITextProvider({ apiKey: "k" });
    await expect(p.embed("brand voice")).resolves.toEqual({ vector: [0.1, 0.2] });
  });
});
