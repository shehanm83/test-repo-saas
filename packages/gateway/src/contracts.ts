export type AuthMode = "dev" | "clerk";
export type QueueMode = "inline" | "sqs";
export type StorageMode = "minio" | "s3";
export type BillingMode = "stub" | "stripe";
export type AiMode = "mock" | "live";

export interface AuthProvider {
  getCurrentUser(): Promise<{ userId: string; workspaceId: string }>;
}

export interface QueueProvider {
  enqueueGenerationJob(payload: { generationId: string; variantId: string }): Promise<void>;
}

export interface StorageProvider {
  getPublicUrl(key: string): string;
}

export interface BillingProvider {
  getBalance(workspaceId: string): Promise<number>;
}

export interface AiProvider {
  generateImage(prompt: string): Promise<{ modelUsed: string; mockAssetKey: string }>;
}
