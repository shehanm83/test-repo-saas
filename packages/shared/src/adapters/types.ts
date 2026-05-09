export interface AuthIdentity {
  userId: string;
  workspaceId: string | null;
  role: "user" | "admin";
}

export interface AuthProvider {
  verifyRequest(headers: Headers): Promise<AuthIdentity | null>;
  setActiveWorkspace(userId: string, workspaceId: string): Promise<void>;
}

export interface SignedUrl {
  url: string;
  fields?: Record<string, string>;
  expiresAt: Date;
}

export interface StorageAdapter {
  putSignedUrl(key: string, contentType: string, ttlSec?: number): Promise<SignedUrl>;
  getSignedUrl(key: string, ttlSec?: number): Promise<string>;
  putBytes(key: string, body: Uint8Array | Buffer, contentType: string): Promise<void>;
  getBytes(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  copy(srcKey: string, dstKey: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface QueueMessage<T> {
  body: T;
  receiptHandle: string;
  approximateReceiveCount: number;
}

export interface QueueAdapter {
  send<T>(queueUrl: string, body: T, opts?: { idempotencyKey?: string }): Promise<void>;
  receive<T>(queueUrl: string, max?: number): Promise<QueueMessage<T>[]>;
  delete(queueUrl: string, receiptHandle: string): Promise<void>;
}

export interface BillingProvider {
  ensureCustomer(workspaceId: string, email: string): Promise<{ customerId: string }>;
  createSubscriptionCheckout(args: {
    workspaceId: string;
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  createTopupCheckout(args: {
    workspaceId: string;
    customerId: string;
    packCode: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  customerPortalUrl(args: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  verifyWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{ id: string; type: string; data: unknown }>;
  refundCharge(args: { chargeId: string; reason?: string }): Promise<void>;
  listPaidInvoices(args: {
    customerId: string;
  }): Promise<
    Array<{
      invoiceId: string;
      priceId: string | null;
      amount: string | null;
      date: string | null;
      hostedInvoiceUrl: string | null;
    }>
  >;
}

export interface AIImageRequest {
  modelCode: string;
  prompt: string;
  negativePrompt?: string;
  references?: { s3Key: string; role: "brand_reference" | "inspiration"; weight: number }[];
  aspectRatio: string;
  width: number;
  height: number;
  seed?: number;
  safetyLevel: "default" | "strict";
}

export interface AIImageResponse {
  imageBytes: Buffer;
  modelUsedCode: string;
  upstreamCostCents: number;
  latencyMs: number;
  safetyFlags: string[];
}

export interface AITextRequest {
  modelCode: string;
  prompt: string;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AITextResponse {
  text: string;
  upstreamCostCents: number;
  latencyMs: number;
}

export interface AIProvider {
  generateImage(req: AIImageRequest): Promise<AIImageResponse>;
  generateText(req: AITextRequest): Promise<AITextResponse>;
  describeImage(s3Key: string): Promise<{ description: string }>;
  moderateText(text: string): Promise<{ flagged: boolean; categories: string[] }>;
  moderateImage(imageBytes: Buffer): Promise<{ flagged: boolean; categories: string[] }>;
  embedText(text: string): Promise<{ vector: number[] }>;
  embedImage(s3Key: string): Promise<{ vector: number[] }>;
}

// Email types live in @vyora/email so the email package owns its own surface
// area. Re-exported here for backwards compatibility with existing imports
// from @vyora/shared/adapters/types.
export type { EmailMessage, EmailProvider } from "@vyora/email";

export interface Telemetry {
  captureException(err: unknown, ctx?: Record<string, unknown>): void;
  metric(name: string, value: number, tags?: Record<string, string>): void;
  startSpan<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
}
