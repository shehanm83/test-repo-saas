import type { AIImageRequest, AIImageResponse, AITextRequest, AITextResponse } from "@vyora/shared";

export interface ProviderCapabilities {
  modelCodes: string[];
  supportsImageToImage: boolean;
  supportsMultiReference: boolean;
  tier: "fast" | "premium" | "design" | "fallback";
}

export interface ImageProvider {
  capabilities: ProviderCapabilities;
  generate(req: AIImageRequest): Promise<AIImageResponse>;
}

export interface TextProvider {
  modelCodes: string[];
  generate(req: AITextRequest): Promise<AITextResponse>;
  embed(text: string): Promise<{ vector: number[] }>;
}

export interface VisionProvider {
  describeImageBytes(bytes: Uint8Array): Promise<{ description: string }>;
}

export interface ModerationProvider {
  moderateText(text: string): Promise<{ flagged: boolean; categories: string[] }>;
  moderateImage(bytes: Uint8Array): Promise<{ flagged: boolean; categories: string[] }>;
}
