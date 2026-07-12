import { createQueueAdapter } from "@layertone/queue";
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

  return { ...base, queue };
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
