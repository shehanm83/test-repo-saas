import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { promptFingerprint } from "./gateway.js";
import type { ImageProvider, TextProvider, VisionProvider, ModerationProvider } from "./types.js";
import type { AIImageRequest, AIImageResponse, AITextRequest, AITextResponse } from "@vyora/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SAMPLES_DIR = resolve(__dirname, "../samples");
const SAMPLE_COUNT = 4;

export class MockImageProvider implements ImageProvider {
  capabilities = {
    // Lists every internal code shipped today plus the legacy llm-id aliases
    // so tests written against either naming still resolve to this mock.
    modelCodes: [
      // Internal codes (canonical post-B3 surface)
      "economy",
      "photoreal-pro",
      "photoreal-ultra",
      "text-master",
      "text-master-pro",
      "design-studio",
      "speed-draft",
      "nova-canvas",
      "nano-banana",
      "nano-banana-pro",
      // Legacy llm-id aliases — keep until all callers migrate
      "flux-1.1-pro",
      "gpt-image-2",
      "gpt-image-1",
      "recraft-v3",
      "bedrock-sd35",
    ],
    supportsImageToImage: true,
    supportsMultiReference: true,
    tier: "fast" as const,
  };

  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly samplesDir: string;

  constructor(opts: { minDelayMs?: number; maxDelayMs?: number; samplesDir?: string } = {}) {
    this.minDelayMs = opts.minDelayMs ?? 0;
    this.maxDelayMs = opts.maxDelayMs ?? 0;
    this.samplesDir = opts.samplesDir ?? DEFAULT_SAMPLES_DIR;
  }

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    if (this.maxDelayMs > 0) {
      const jitter = Math.random() * (this.maxDelayMs - this.minDelayMs);
      await new Promise<void>((r) => setTimeout(r, this.minDelayMs + jitter));
    }

    const fp = promptFingerprint(req);
    const idx = parseInt(fp.slice(0, 2), 16) % SAMPLE_COUNT;
    const samplePath = resolve(this.samplesDir, `sample-${idx}.png`);

    const png = existsSync(samplePath)
      ? await sharp(samplePath)
          .resize(req.width, req.height, { fit: "cover" })
          .png()
          .toBuffer()
      : await sharp({
          create: {
            width: req.width,
            height: req.height,
            channels: 3,
            background: {
              r: parseInt(fp.slice(0, 2), 16),
              g: parseInt(fp.slice(2, 4), 16),
              b: parseInt(fp.slice(4, 6), 16),
            },
          },
        })
          .png()
          .toBuffer();

    return {
      imageBytes: png,
      modelUsedCode: req.modelCode,
      upstreamCostCents: 0,
      latencyMs: this.maxDelayMs > 0
        ? Math.round(this.minDelayMs + (this.maxDelayMs - this.minDelayMs) * 0.5)
        : 5,
      safetyFlags: [],
    };
  }
}

export class MockTextProvider implements TextProvider {
  modelCodes = ["claude-haiku-4-5", "gpt-5.4-mini"];

  async generate(req: AITextRequest): Promise<AITextResponse> {
    return {
      text: `(mock text for prompt: ${req.prompt.slice(0, 40)})`,
      upstreamCostCents: 0,
      latencyMs: 1,
    };
  }

  async embed(text: string): Promise<{ vector: number[] }> {
    const hash = text.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return { vector: Array.from({ length: 1536 }, (_, i) => Math.sin(i + hash)) };
  }
}

export class MockVisionProvider implements VisionProvider {
  async describeImageBytes(_bytes: Uint8Array): Promise<{ description: string }> {
    return { description: "(mock vision: soft-lit, minimal, neutral tones)" };
  }
}

export class MockModerationProvider implements ModerationProvider {
  async moderateText(_text: string) { return { flagged: false, categories: [] }; }
  async moderateImage(_bytes: Uint8Array) { return { flagged: false, categories: [] }; }
}
