import { createQueueAdapter } from "@vyora/queue";
import { createAdapters, type Adapters } from "@vyora/shared/adapters";
import { loadConfig } from "@vyora/shared/config";

// Audit fix #5: previously rebuilt the queue (and via createAdapters, the
// rest of the AWS-SDK-using stack) on every API route call. Now cached at
// module scope — loadConfig() is itself cached, so this runs once per
// process. Saves 10-50ms per /api/* call and stops connection-pool churn.
let cached: Adapters | null = null;

export function createServerAdapters(): Adapters {
  if (cached) return cached;
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

  cached = { ...base, queue };
  return cached;
}
