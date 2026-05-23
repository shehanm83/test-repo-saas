import { createHash } from "node:crypto";
import type {
  AIImageRequest,
  AIImageResponse,
  AIProvider,
  AITextRequest,
  AITextResponse,
  StorageAdapter,
} from "@layertone/shared";
import type { ImageProvider, TextProvider, VisionProvider, ModerationProvider } from "./types.js";
import { chooseProvider } from "./routing.js";

export class Gateway implements AIProvider {
  private images = new Map<string, ImageProvider>();
  private text: TextProvider | null = null;
  private vision: VisionProvider | null = null;
  private moderation: ModerationProvider | null = null;
  private storage: StorageAdapter | null = null;

  registerImage(p: ImageProvider): void {
    for (const code of p.capabilities.modelCodes) this.images.set(code, p);
  }
  setText(p: TextProvider): void { this.text = p; }
  setVision(p: VisionProvider): void { this.vision = p; }
  setModeration(p: ModerationProvider): void { this.moderation = p; }
  setStorage(s: StorageAdapter): void { this.storage = s; }

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

  async embedImage(s3Key: string): Promise<{ vector: number[] }> {
    const { description } = await this.describeImage(s3Key);
    return this.embedText(description);
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
