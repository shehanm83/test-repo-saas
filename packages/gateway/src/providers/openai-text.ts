import OpenAI from "openai";
import type { TextProvider } from "../types";
import type { AITextRequest, AITextResponse } from "@layertone/shared";

const DEFAULT_TEXT_MODEL = "gpt-5.4-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";

function extractOutputText(response: unknown): string {
  const r = response as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: unknown; type?: unknown }> }>;
  };

  if (typeof r.output_text === "string" && r.output_text.trim().length > 0) {
    return r.output_text;
  }

  const contentText = r.output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => (typeof item.text === "string" ? item.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (contentText) return contentText;
  throw new Error("openai-no-text-output");
}

export class OpenAITextProvider implements TextProvider {
  readonly modelCodes: string[];
  private readonly client: OpenAI;

  constructor(private readonly opts: { apiKey: string; model?: string; embeddingModel?: string }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
    this.modelCodes = Array.from(new Set([opts.model ?? DEFAULT_TEXT_MODEL, DEFAULT_TEXT_MODEL]));
  }

  async generate(req: AITextRequest): Promise<AITextResponse> {
    const start = Date.now();
    const model = req.modelCode || this.opts.model || DEFAULT_TEXT_MODEL;
    const response = await this.client.responses.create({
      model,
      input: req.prompt,
      ...(req.systemPrompt ? { instructions: req.systemPrompt } : {}),
      ...(req.maxTokens ? { max_output_tokens: req.maxTokens } : {}),
    } as never);

    return {
      text: extractOutputText(response),
      upstreamCostCents: 0,
      latencyMs: Date.now() - start,
    };
  }

  async embed(text: string): Promise<{ vector: number[] }> {
    const response = await this.client.embeddings.create({
      model: this.opts.embeddingModel ?? EMBEDDING_MODEL,
      input: text,
    });
    const vector = response.data[0]?.embedding;
    if (!vector) throw new Error("openai-no-embedding");
    return { vector };
  }
}
