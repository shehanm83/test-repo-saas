import {
  Gateway,
  MockImageProvider,
  MockTextProvider,
  MockVisionProvider,
  MockModerationProvider,
} from "@vyora/gateway";
import { createQueueAdapter } from "@vyora/queue";
import { loadConfig, createAdapters } from "@vyora/shared";

import { GenerationWorker } from "../src/handler.js";
import { initWorkerSentry } from "../src/instrumentation.js";

initWorkerSentry();

const config = loadConfig();

function buildMockAI(): Gateway {
  const gw = new Gateway();
  gw.registerImage(new MockImageProvider({ minDelayMs: 4000, maxDelayMs: 10000 }));
  gw.setText(new MockTextProvider());
  gw.setVision(new MockVisionProvider());
  gw.setModeration(new MockModerationProvider());
  return gw;
}

if (config.ai.mode !== "mock") {
  throw new Error(`Worker dev script only supports AI_MODE=mock. Got: ${config.ai.mode}`);
}

const queueConfig = {
  mode: config.queue.mode,
  region: config.queue.region,
  ...(config.queue.endpoint ? { endpoint: config.queue.endpoint } : {}),
  ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
  ...(config.storage.secretAccessKey ? { secretAccessKey: config.storage.secretAccessKey } : {}),
};

const adapters = {
  ...createAdapters(config),
  queue: createQueueAdapter(queueConfig),
  ai: buildMockAI() as never,
};

const worker = new GenerationWorker(config, adapters);

console.warn("worker starting; queue:", config.queue.mode, config.queue.generationsQueue, "| ai: mock (sample images, 4–10s delay)");

while (true) {
  const messages = await adapters.queue.receive<{
    generationId: string;
    variantId: string;
    workspaceId: string;
  }>(config.queue.generationsQueue, 5);

  adapters.telemetry.metric("queue.depth", messages.length, { queue: "generations" });

  for (const m of messages) {
    try {
      await worker.handle(m.body);
      await adapters.queue.delete(config.queue.generationsQueue, m.receiptHandle);
    } catch (e) {
      adapters.telemetry.captureException(e, { variantId: m.body.variantId });
      console.error("worker error", e);
    }
  }

  if (messages.length === 0) {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
