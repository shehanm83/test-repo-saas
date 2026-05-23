import { createQueueAdapter } from "@layertone/queue";
import { createAdapters } from "@layertone/shared/adapters";
import { loadConfig } from "@layertone/shared/config";

export function createServerAdapters() {
  const config = loadConfig();
  const base = createAdapters(config);

  const queue = createQueueAdapter({
    mode: config.queue.mode,
    region: config.queue.region,
    ...(config.queue.endpoint ? { endpoint: config.queue.endpoint } : {}),
    ...(config.storage.accessKeyId
      ? { accessKeyId: config.storage.accessKeyId }
      : {}),
    ...(config.storage.secretAccessKey
      ? { secretAccessKey: config.storage.secretAccessKey }
      : {}),
  });

  return { ...base, queue };
}
