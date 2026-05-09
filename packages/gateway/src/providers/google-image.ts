import type { ImageProvider, ProviderCapabilities } from "../types.js";
import type { AIImageRequest, AIImageResponse, StorageAdapter } from "@vyora/shared";

const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta";

const VENDOR_ID_FOR_CODE: Record<string, string> = {
  "nano-banana": "gemini-2.5-flash-image",
  "nano-banana-pro": "gemini-3-pro-image-preview",
};

const COST_CENTS_FOR_CODE: Record<string, number> = {
  "nano-banana": 3,
  "nano-banana-pro": 7,
};

// Gemini's image API takes an `imageSize` keyword + aspectRatio rather than
// raw pixel dimensions. Translate the W×H the rest of the system sends in.
function pickImageSize(width: number, height: number, allowAbove1k: boolean): string {
  const px = width * height;
  if (allowAbove1k && px >= 4_000_000) return "4K";
  if (allowAbove1k && px >= 1_500_000) return "2K";
  return "1K";
}

function pickAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  // Gemini documents 1:1, 16:9, 4:3, 9:16, 3:4, 21:9. Snap to the nearest.
  const candidates: Array<[string, number]> = [
    ["1:1", 1],
    ["16:9", 16 / 9],
    ["9:16", 9 / 16],
    ["4:3", 4 / 3],
    ["3:4", 3 / 4],
    ["21:9", 21 / 9],
  ];
  let best = candidates[0]!;
  let bestDelta = Math.abs(ratio - best[1]);
  for (const c of candidates) {
    const d = Math.abs(ratio - c[1]);
    if (d < bestDelta) {
      best = c;
      bestDelta = d;
    }
  }
  return best[0];
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  inline_data?: { mime_type: string; data: string };
}

export class GoogleImageProvider implements ImageProvider {
  capabilities: ProviderCapabilities = {
    modelCodes: ["nano-banana", "nano-banana-pro"],
    supportsImageToImage: true,
    supportsMultiReference: true,
    tier: "premium",
  };

  constructor(private readonly opts: { apiKey: string; storage: StorageAdapter }) {}

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const start = Date.now();
    const vendorId = VENDOR_ID_FOR_CODE[req.modelCode];
    if (!vendorId) throw new Error(`google-image-unknown-model:${req.modelCode}`);

    const allowAbove1k = req.modelCode === "nano-banana-pro";
    const imageSize = pickImageSize(req.width, req.height, allowAbove1k);
    const aspectRatio = pickAspectRatio(req.width, req.height);

    const parts: GeminiPart[] = [{ text: req.prompt }];
    for (const ref of req.references ?? []) {
      const bytes = await this.opts.storage.getBytes(ref.s3Key);
      parts.push({
        inlineData: { mimeType: "image/png", data: Buffer.from(bytes).toString("base64") },
      });
    }

    const body = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        responseFormat: { image: { aspectRatio, imageSize } },
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
      },
    };

    const url = `${GOOGLE_BASE}/models/${vendorId}:generateContent?key=${encodeURIComponent(this.opts.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`google-image-status-${res.status}`);

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
    };
    const candidate = json.candidates?.[0];
    const candParts = candidate?.content?.parts ?? [];
    const imagePart = candParts.find((p) => p.inlineData?.data || p.inline_data?.data);
    const data = imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
    if (!data) {
      throw new Error(
        `google-image-no-output${candidate?.finishReason ? `:${candidate.finishReason}` : ""}`,
      );
    }

    return {
      imageBytes: Buffer.from(data, "base64"),
      modelUsedCode: req.modelCode,
      upstreamCostCents: COST_CENTS_FOR_CODE[req.modelCode] ?? 5,
      latencyMs: Date.now() - start,
      safetyFlags: [],
    };
  }
}
