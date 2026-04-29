import sharp from "sharp";
import { promptFingerprint } from "./gateway.js";
import type { ImageProvider, TextProvider, VisionProvider, ModerationProvider } from "./types.js";
import type { AIImageRequest, AIImageResponse, AITextRequest, AITextResponse } from "@vyora/shared";

export class MockImageProvider implements ImageProvider {
  capabilities = {
    modelCodes: ["flux-1.1-pro", "gpt-image-1", "recraft-v3", "bedrock-sd35", "nova-canvas"],
    supportsImageToImage: true,
    supportsMultiReference: true,
    tier: "fast" as const,
  };

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    const fp = promptFingerprint(req);
    const png = await sharp({
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
    }).png().toBuffer();

    return {
      imageBytes: png,
      modelUsedCode: req.modelCode,
      upstreamCostCents: 0,
      latencyMs: 5,
      safetyFlags: [],
    };
  }
}

export class MockTextProvider implements TextProvider {
  modelCodes = ["claude-haiku-4-5"];

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
