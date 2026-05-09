import OpenAI from "openai";
import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse, StorageAdapter } from "@vyora/shared";

const GPT_IMAGE_1_SIZE_TO_OPENAI: Record<string, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1536",
  "9:16": "1024x1536",
  "16:9": "1536x1024",
  "1.91:1": "1536x1024",
  "2:3": "1024x1536",
};

const GPT_IMAGE_2_SIZE_TO_OPENAI: Record<string, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1536",
  "9:16": "1024x1536",
  "16:9": "1536x1024",
  "1.91:1": "1536x1024",
  "2:3": "1024x1536",
};

const COST_STD = 17;
const COST_HD = 30;
const DEFAULT_MODEL = "gpt-image-2";

export class OpenAIImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities;

  private client: OpenAI;

  constructor(private readonly opts: { apiKey: string; storage: StorageAdapter; model?: string }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
    this.capabilities = {
      modelCodes: Array.from(new Set([opts.model ?? DEFAULT_MODEL, DEFAULT_MODEL, "gpt-image-1"])),
      supportsImageToImage: true,
      supportsMultiReference: true,
      tier: "premium",
    };
  }

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const model = req.modelCode || this.opts.model || DEFAULT_MODEL;
    const size = resolveOpenAISize(model, req.aspectRatio);
    const quality = req.width * req.height > 1280 * 1280 ? "high" : "medium";

    let result;
    if (req.references && req.references.length > 0) {
      const inputs = await Promise.all(
        req.references.map(async (r) => {
          const bytes = await this.opts.storage.getBytes(r.s3Key);
          return new File([Buffer.from(bytes)], `ref-${r.role}.png`, { type: "image/png" });
        }),
      );
      result = await this.client.images.edit({
        model,
        prompt: req.prompt,
        image: inputs.length === 1 ? inputs[0]! : inputs,
        size,
        quality,
        output_format: "png",
        n: 1,
      } as never);
    } else {
      result = await this.client.images.generate({
        model,
        prompt: req.prompt,
        size,
        quality,
        output_format: "png",
        n: 1,
      } as never);
    }

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("openai-no-image");

    return {
      imageBytes: Buffer.from(b64, "base64"),
      modelUsedCode: model,
      upstreamCostCents: quality === "high" ? COST_HD : COST_STD,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}

function resolveOpenAISize(model: string, aspectRatio: string): string {
  const sizes = model === "gpt-image-1" ? GPT_IMAGE_1_SIZE_TO_OPENAI : GPT_IMAGE_2_SIZE_TO_OPENAI;
  return sizes[aspectRatio] ?? "1024x1024";
}
