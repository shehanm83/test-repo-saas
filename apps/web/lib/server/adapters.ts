import { createQueueAdapter } from "@layertone/queue";
import {
  AnthropicTextProvider,
  AnthropicVisionProvider,
  BedrockImageProvider,
  FluxImageProvider,
  Gateway,
  MockImageProvider,
  MockModerationProvider,
  MockTextProvider,
  MockVisionProvider,
  OpenAIImageProvider,
  OpenAIModerationProvider,
  OpenAITextProvider,
  RecraftImageProvider,
} from "@layertone/gateway";
import { createAdapters } from "@layertone/shared/adapters";
import { loadConfig, type Config } from "@layertone/shared/config";
import { S3StorageAdapter } from "@layertone/storage";

export function createServerAdapters() {
  const config = loadConfig();
  const base = createAdapters(config);

  const queue = createQueueAdapter({
    mode: config.queue.mode,
    region: config.queue.region,
    ...(config.queue.endpoint ? { endpoint: config.queue.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey ? { secretAccessKey: config.storage.secretAccessKey } : {}),
  });

  return { ...base, queue, ai: createServerAi(config, base.storage) };
}

function createServerAi(config: Config, storage: ReturnType<typeof createAdapters>["storage"]) {
  const gateway = new Gateway();
  gateway.setStorage(storage);

  if (config.ai.mode === "mock") {
    gateway.registerImage(new MockImageProvider());
    gateway.setText(new MockTextProvider());
    gateway.setVision(new MockVisionProvider());
    gateway.setModeration(new MockModerationProvider());
    return gateway;
  }

  if (config.ai.openaiKey) {
    gateway.registerImage(
      new OpenAIImageProvider({
        apiKey: config.ai.openaiKey,
        storage,
        model: config.ai.openaiImageModel,
      }),
    );
    gateway.setText(
      new OpenAITextProvider({ apiKey: config.ai.openaiKey, model: config.ai.openaiTextModel }),
    );
    gateway.setModeration(new OpenAIModerationProvider({ apiKey: config.ai.openaiKey }));
  } else if (config.ai.anthropicKey) {
    gateway.setText(new AnthropicTextProvider({ apiKey: config.ai.anthropicKey }));
  }
  if (config.ai.anthropicKey) {
    gateway.setVision(new AnthropicVisionProvider({ apiKey: config.ai.anthropicKey }));
  } else {
    gateway.setVision(new MockVisionProvider());
  }
  if (config.ai.replicateToken) {
    gateway.registerImage(
      new FluxImageProvider({ replicateToken: config.ai.replicateToken, storage }),
    );
  }
  if (config.ai.recraftKey) {
    gateway.registerImage(new RecraftImageProvider({ apiKey: config.ai.recraftKey, storage }));
  }
  gateway.registerImage(new BedrockImageProvider({ region: config.ai.bedrockRegion }));
  return gateway;
}

export function createGlobalStorageAdapter(config: Config = loadConfig()) {
  return new S3StorageAdapter({
    region: config.storage.region,
    bucket: config.storage.bucketGlobal,
    forcePathStyle: config.storage.mode === "minio",
    ...(config.storage.endpoint ? { endpoint: config.storage.endpoint } : {}),
    ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
    ...(config.storage.secretAccessKey ? { secretAccessKey: config.storage.secretAccessKey } : {}),
  });
}
