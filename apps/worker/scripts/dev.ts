import { createQueueAdapter } from "@studio/queue";
import { loadConfig, createAdapters } from "@studio/shared";

import { GenerationWorker } from "../src/handler.js";

const config = loadConfig();
const queueConfig = {
  mode: config.queue.mode,
  region: config.queue.region,
  ...(config.queue.endpoint ? { endpoint: config.queue.endpoint } : {}),
};
const adapters = {
  ...createAdapters(config),
  queue: createQueueAdapter(queueConfig),
};
const worker = new GenerationWorker(config, adapters);

console.warn("worker starting; queue:", config.queue.mode, config.queue.generationsQueue);

while (true) {
  const messages = await adapters.queue.receive<{
    generationId: string;
    variantId: string;
    workspaceId: string;
  }>(config.queue.generationsQueue, 5);

  for (const m of messages) {
    try {
      await worker.handle(m.body);
      await adapters.queue.delete(config.queue.generationsQueue, m.receiptHandle);
    } catch (e) {
      console.error("worker error", e);
    }
  }

  if (messages.length === 0) {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
