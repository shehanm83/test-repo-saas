import { createHash } from "node:crypto";
import type {
  AIImageRequest,
  AIImageResponse,
  AIProvider,
  AITextRequest,
  AITextResponse,
  StorageAdapter,
} from "@vyora/shared";
import type { ImageProvider, TextProvider, VisionProvider, ModerationProvider } from "./types.js";
import { chooseProvider } from "./routing.js";

/** Read-only view of what {@link Gateway.getSupportedSizes} returns. */
export interface SupportedSize {
  width: number;
  height: number;
  label?: string | null;
}

export type SupportedSizesLookup = (modelCode: string) => Promise<SupportedSize[]>;

const SUPPORTED_SIZES_TTL_MS = 60_000;

export class Gateway implements AIProvider {
  private images = new Map<string, ImageProvider>();
  private text: TextProvider | null = null;
  private vision: VisionProvider | null = null;
  private moderation: ModerationProvider | null = null;
  private storage: StorageAdapter | null = null;
  private sizesLookup: SupportedSizesLookup | null = null;
  private sizesCache = new Map<string, { fetchedAt: number; sizes: SupportedSize[] }>();

  registerImage(p: ImageProvider): void {
    for (const code of p.capabilities.modelCodes) this.images.set(code, p);
  }
  setText(p: TextProvider): void { this.text = p; }
  setVision(p: VisionProvider): void { this.vision = p; }
  setModeration(p: ModerationProvider): void { this.moderation = p; }
  setStorage(s: StorageAdapter): void { this.storage = s; }
  setSupportedSizesLookup(fn: SupportedSizesLookup): void {
    this.sizesLookup = fn;
    this.sizesCache.clear();
  }

  async getSupportedSizes(modelCode: string): Promise<SupportedSize[]> {
    if (!this.sizesLookup) throw new Error("supported-sizes-lookup-not-injected");
    const cached = this.sizesCache.get(modelCode);
    if (cached && Date.now() - cached.fetchedAt < SUPPORTED_SIZES_TTL_MS) {
      return cached.sizes;
    }
    const sizes = await this.sizesLookup(modelCode);
    this.sizesCache.set(modelCode, { fetchedAt: Date.now(), sizes });
    return sizes;
  }

  async generateImage(req: AIImageRequest): Promise<AIImageResponse> {
    const hasInspiration = !!req.references?.some((r) => r.role === "inspiration");
    const route = chooseProvider(this.images, req.modelCode, hasInspiration);

    if (route.needsVisionFallback) {
      const inspiration = req.references!.find((r) => r.role === "inspiration")!;
      if (!this.vision) throw new Error("vision-provider-not-registered");
      if (!this.storage) throw new Error("storage-not-injected");
      const bytes = await this.storage.getBytes(inspiration.s3Key);
      const { description } = await this.vision.describeImageBytes(bytes);
      const newPrompt = `${req.prompt}\n\nStyle cues from reference: ${description}`;
      const nonRefReq = { ...req, references: req.references!.filter((r) => r.role !== "inspiration"), prompt: newPrompt };
      return route.provider.generate(nonRefReq);
    }

    return route.provider.generate({ ...req, modelCode: route.modelCode });
  }

  async generateText(req: AITextRequest): Promise<AITextResponse> {
    if (!this.text) throw new Error("text-provider-not-registered");
    return this.text.generate(req);
  }

  async describeImage(s3Key: string): Promise<{ description: string }> {
    if (!this.vision) throw new Error("vision-provider-not-registered");
    if (!this.storage) throw new Error("storage-not-injected");
    const bytes = await this.storage.getBytes(s3Key);
    return this.vision.describeImageBytes(bytes);
  }

  async moderateText(text: string) {
    if (!this.moderation) return { flagged: false, categories: [] };
    return this.moderation.moderateText(text);
  }

  async moderateImage(bytes: Buffer) {
    if (!this.moderation) return { flagged: false, categories: [] };
    return this.moderation.moderateImage(bytes);
  }

  async embedText(text: string): Promise<{ vector: number[] }> {
    if (!this.text) throw new Error("text-provider-not-registered");
    return this.text.embed(text);
  }

  async embedImage(_s3Key: string): Promise<{ vector: number[] }> {
    // Implemented via vision describe → embed in slice 24
    throw new Error("embedImage not wired until slice 24");
  }
}

/** Stable hash for mock keying. */
export function promptFingerprint(req: AIImageRequest): string {
  return createHash("sha256")
    .update(JSON.stringify({
      m: req.modelCode,
      p: req.prompt,
      n: req.negativePrompt,
      a: req.aspectRatio,
      w: req.width,
      h: req.height,
      refs: req.references?.map((r) => r.s3Key + ":" + r.role) ?? [],
    }))
    .digest("hex").slice(0, 16);
}
