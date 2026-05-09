import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse, StorageAdapter } from "@vyora/shared";

const BFL_BASE = "https://api.bfl.ai/v1";

const VENDOR_ID_FOR_CODE: Record<string, string> = {
  "photoreal-pro": "flux-pro-1.1",
  "photoreal-ultra": "flux-pro-1.1-ultra",
};

const COST_CENTS_FOR_CODE: Record<string, number> = {
  "photoreal-pro": 4,
  "photoreal-ultra": 6,
};

const POLL_INTERVAL_MS = 750;
const POLL_TIMEOUT_MS = 90_000;

// flux-pro-1.1 accepts 256–1440 in steps of 32. Ultra is documented up to 4MP.
// We snap to the multiple-of-32 grid and clamp to the per-model max.
function snapDimension(value: number, max: number): number {
  const clamped = Math.min(Math.max(value, 256), max);
  return Math.round(clamped / 32) * 32;
}

export class BFLImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["photoreal-pro", "photoreal-ultra"],
    supportsImageToImage: true,
    supportsMultiReference: false,
    tier: "premium",
  };

  constructor(private readonly opts: { apiKey: string; storage: StorageAdapter }) {}

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const vendorId = VENDOR_ID_FOR_CODE[req.modelCode];
    if (!vendorId) throw new Error(`bfl-unknown-model:${req.modelCode}`);

    const maxAxis = vendorId === "flux-pro-1.1-ultra" ? 2752 : 1440;
    const width = snapDimension(req.width, maxAxis);
    const height = snapDimension(req.height, maxAxis);

    const inspiration = req.references?.find((r) => r.role === "inspiration")
      ?? req.references?.find((r) => r.role === "brand_reference");
    let imagePromptB64: string | undefined;
    if (inspiration) {
      const bytes = await this.opts.storage.getBytes(inspiration.s3Key);
      imagePromptB64 = Buffer.from(bytes).toString("base64");
    }

    const body = {
      prompt: req.prompt,
      width,
      height,
      seed: req.seed,
      output_format: "png",
      // BFL safety: 0 strictest, 6 loosest. Default is 2.
      safety_tolerance: req.safetyLevel === "strict" ? 1 : 2,
      ...(imagePromptB64 ? { image_prompt: imagePromptB64 } : {}),
    };

    const createRes = await fetch(`${BFL_BASE}/${vendorId}`, {
      method: "POST",
      headers: { "x-key": this.opts.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!createRes.ok) {
      throw new Error(`bfl-create-status-${createRes.status}`);
    }
    const created = (await createRes.json()) as { id?: string; polling_url?: string };
    const pollUrl = created.polling_url;
    if (!pollUrl) throw new Error("bfl-no-polling-url");

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let result: { status: string; result?: { sample?: string } } | null = null;
    while (Date.now() < deadline) {
      const pollRes = await fetch(pollUrl, {
        headers: { "x-key": this.opts.apiKey, accept: "application/json" },
      });
      if (!pollRes.ok) throw new Error(`bfl-poll-status-${pollRes.status}`);
      result = (await pollRes.json()) as { status: string; result?: { sample?: string } };
      if (result.status === "Ready") break;
      if (result.status === "Error" || result.status === "Failed") {
        throw new Error(`bfl-job-${result.status.toLowerCase()}`);
      }
      await sleep(POLL_INTERVAL_MS);
    }
    if (!result || result.status !== "Ready") throw new Error("bfl-poll-timeout");

    const sampleUrl = result.result?.sample;
    if (!sampleUrl) throw new Error("bfl-no-sample-url");

    const imgRes = await fetch(sampleUrl);
    if (!imgRes.ok) throw new Error(`bfl-image-status-${imgRes.status}`);
    const bytes = Buffer.from(await imgRes.arrayBuffer());

    return {
      imageBytes: bytes,
      modelUsedCode: req.modelCode,
      upstreamCostCents: COST_CENTS_FOR_CODE[req.modelCode] ?? 5,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
