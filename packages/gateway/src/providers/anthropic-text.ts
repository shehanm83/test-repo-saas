import Anthropic from "@anthropic-ai/sdk";
import type { TextProvider } from "../types.js";
import type { AITextRequest, AITextResponse } from "@studio/shared";

export class AnthropicTextProvider implements TextProvider {
  modelCodes = ["claude-haiku-4-5"];
  private client: Anthropic;

  constructor(private readonly opts: { apiKey: string }) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
  }

  async generate(req: AITextRequest): Promise<AITextResponse> {
    const start = Date.now();
    const r = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: req.maxTokens ?? 800,
      ...(req.systemPrompt ? { system: req.systemPrompt } : {}),
      messages: [{ role: "user", content: req.prompt }],
    });
    const text = r.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");
    return {
      text,
      upstreamCostCents: Math.ceil((r.usage.input_tokens + r.usage.output_tokens) / 1000),
      latencyMs: Date.now() - start,
    };
  }

  async embed(text: string): Promise<{ vector: number[] }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY required for embeddings");
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!r.ok) throw new Error(`openai-embed-${r.status}`);
    const out = (await r.json()) as { data: { embedding: number[] }[] };
    return { vector: out.data[0]!.embedding };
  }
}
