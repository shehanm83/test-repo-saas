import { NoopTelemetry } from "@vyora/observability/noop";
import { InlineQueueAdapter } from "@vyora/queue";
import type { AIProvider, Config } from "@vyora/shared";
import { S3StorageAdapter } from "@vyora/storage";
import { GenerationWorker } from "@vyora/worker/handler";

const MOCK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

function createInlineMockAi(): AIProvider {
  return {
    async generateImage(req) {
      return {
        imageBytes: MOCK_PNG,
        modelUsedCode: req.modelCode,
        upstreamCostCents: 0,
        latencyMs: 1,
        safetyFlags: [],
      };
    },
    async generateText(req) {
      return {
        text: `(mock text for prompt: ${req.prompt.slice(0, 40)})`,
        upstreamCostCents: 0,
        latencyMs: 1,
      };
    },
    async describeImage() {
      return { description: "(mock vision: soft-lit, minimal, neutral tones)" };
    },
    async moderateText() {
      return { flagged: false, categories: [] };
    },
    async moderateImage() {
      return { flagged: false, categories: [] };
    },
    async embedText(text) {
      const hash = text.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return { vector: Array.from({ length: 1536 }, (_, index) => Math.sin(index + hash)) };
    },
    async embedImage() {
      return { vector: Array.from({ length: 1536 }, () => 0) };
    },
  };
}

export function createInlineWorkerQueue(config: Config): InlineQueueAdapter {
  const storage = new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketApp,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey
      ? { secretAccessKey: config.storage.secretAccessKey }
      : {}),
  });

  const worker = new GenerationWorker(config, {
    storage,
    ai: createInlineMockAi(),
    telemetry: new NoopTelemetry(),
    queue: null as never,
    auth: null as never,
    billing: null as never,
    email: null as never,
  });

  const adapter = new InlineQueueAdapter();
  adapter.registerHandler(
    config.queue.generationsQueue,
    (job) =>
      worker.handle(
        job as { generationId: string; variantId: string; workspaceId: string },
      ),
  );

  return adapter;
}
