import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse, StorageAdapter } from "@layertone/shared";

const COST_STD = 8;
const COST_LARGE = 12;

export class RecraftImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["recraft-v3"],
    supportsImageToImage: true,
    supportsMultiReference: false,
    tier: "design",
  };

  constructor(private readonly opts: { apiKey: string; storage: StorageAdapter }) {}

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const inspiration = req.references?.find((r) => r.role === "inspiration");
    const styleRefUrl = inspiration
      ? await this.opts.storage.getSignedUrl(inspiration.s3Key)
      : undefined;

    const body = {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      style: "any",
      size: `${req.width}x${req.height}`,
      style_reference_url: styleRefUrl,
      style_reference_strength: inspiration?.weight,
    };

    const res = await fetch("https://external.api.recraft.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`recraft-status-${res.status}`);
    const out = (await res.json()) as { data: { url: string }[] };
    const url = out.data[0]?.url;
    if (!url) throw new Error("recraft-no-output");

    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`recraft-image-status-${imgRes.status}`);
    const bytes = Buffer.from(await imgRes.arrayBuffer());

    return {
      imageBytes: bytes,
      modelUsedCode: "recraft-v3",
      upstreamCostCents: req.width * req.height > 1024 * 1024 ? COST_LARGE : COST_STD,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}
