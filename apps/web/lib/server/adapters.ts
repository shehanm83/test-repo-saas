import { createQueueAdapter } from "@vyora/queue";
import { createAdapters, loadConfig } from "@vyora/shared";

export function createServerAdapters() {
  const config = loadConfig();
  const base = createAdapters(config);
  const queueConfig = {
    mode: config.queue.mode,
    region: config.queue.region,
    ...(config.queue.endpoint ? { endpoint: config.queue.endpoint } : {}),
  };

  return {
    ...base,
    queue: createQueueAdapter(queueConfig),
  };
}
