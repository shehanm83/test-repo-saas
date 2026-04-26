import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse, StorageAdapter } from "@studio/shared";

const ASPECT_TO_FLUX: Record<string, string> = {
  "1:1": "1:1", "4:5": "4:5", "9:16": "9:16", "16:9": "16:9", "1.91:1": "21:9", "2:3": "2:3",
};

const FLUX_COST_CENTS_STANDARD = 4;
const FLUX_COST_CENTS_LARGE = 8;

export class FluxImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["flux-1.1-pro"],
    supportsImageToImage: true,
    supportsMultiReference: false,
    tier: "fast",
  };

  constructor(private readonly opts: { replicateToken: string; storage: StorageAdapter }) {}

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const inspiration = req.references?.find((r) => r.role === "inspiration");
    const imagePromptUrl = inspiration
      ? await this.opts.storage.getSignedUrl(inspiration.s3Key)
      : undefined;

    const body = {
      version: "black-forest-labs/flux-1.1-pro",
      input: {
        prompt: req.prompt,
        negative_prompt: req.negativePrompt,
        aspect_ratio: ASPECT_TO_FLUX[req.aspectRatio] ?? "1:1",
        output_format: "png",
        safety_tolerance: req.safetyLevel === "strict" ? 1 : 3,
        image_prompt: imagePromptUrl,
        image_prompt_strength: inspiration?.weight ?? 0.6,
        seed: req.seed,
      },
    };

    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.opts.replicateToken}`,
        "Content-Type": "application/json",
        "Prefer": "wait",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`flux-api-status-${res.status}`);
    const out = (await res.json()) as { output: string | string[]; status: string; error?: string };
    if (out.status !== "succeeded") throw new Error(`flux-status-${out.status}: ${out.error ?? ""}`);

    const url = Array.isArray(out.output) ? out.output[0] : out.output;
    if (!url) throw new Error("flux-no-output");

    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`flux-image-status-${imgRes.status}`);
    const bytes = Buffer.from(await imgRes.arrayBuffer());

    return {
      imageBytes: bytes,
      modelUsedCode: "flux-1.1-pro",
      upstreamCostCents: req.width * req.height > 1024 * 1024 ? FLUX_COST_CENTS_LARGE : FLUX_COST_CENTS_STANDARD,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}
