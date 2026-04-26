import OpenAI from "openai";
import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse, StorageAdapter } from "@studio/shared";

const SIZE_TO_OPENAI: Record<string, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1280",
  "9:16": "1024x1792",
  "16:9": "1792x1024",
  "1.91:1": "1792x1024",
  "2:3": "1024x1536",
};

const COST_STD = 17;
const COST_HD = 30;

export class OpenAIImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["gpt-image-1"],
    supportsImageToImage: true,
    supportsMultiReference: true,
    tier: "premium",
  };

  private client: OpenAI;

  constructor(private readonly opts: { apiKey: string; storage: StorageAdapter }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
  }

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const size = (SIZE_TO_OPENAI[req.aspectRatio] ?? "1024x1024") as "1024x1024";
    const quality = (req.width * req.height > 1280 * 1280 ? "high" : "medium") as "high" | "medium" | "low";

    let result;
    if (req.references && req.references.length > 0) {
      const inputs = await Promise.all(
        req.references.map(async (r) => {
          const bytes = await this.opts.storage.getBytes(r.s3Key);
          return new File([Buffer.from(bytes)], `ref-${r.role}.png`, { type: "image/png" });
        }),
      );
      result = await this.client.images.edit({
        model: "gpt-image-1",
        prompt: req.prompt,
        image: inputs[0]!,
        size,
        quality,
        n: 1,
      });
    } else {
      result = await this.client.images.generate({
        model: "gpt-image-1",
        prompt: req.prompt,
        size,
        quality,
        n: 1,
      });
    }

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("openai-no-image");

    return {
      imageBytes: Buffer.from(b64, "base64"),
      modelUsedCode: "gpt-image-1",
      upstreamCostCents: quality === "high" ? COST_HD : COST_STD,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}
