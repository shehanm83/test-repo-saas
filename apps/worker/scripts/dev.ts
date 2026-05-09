import {
  Gateway,
  MockImageProvider,
  MockTextProvider,
  MockVisionProvider,
  MockModerationProvider,
  OpenAIImageProvider,
  OpenAIModerationProvider,
  OpenAITextProvider,
} from "@vyora/gateway";
import { createQueueAdapter } from "@vyora/queue";
import { loadConfig, createAdapters } from "@vyora/shared";

import { CaptionWorker } from "../src/caption-handler.js";
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

function buildRealAI(storage: ReturnType<typeof createAdapters>["storage"]): Gateway {
  if (!config.ai.openaiKey) {
    throw new Error("AI_MODE=real requires OPENAI_API_KEY for the OpenAI dev provider.");
  }

  const gw = new Gateway();
  gw.setStorage(storage);
  gw.registerImage(
    new OpenAIImageProvider({
      apiKey: config.ai.openaiKey,
      storage,
      model: config.ai.openaiImageModel,
    }),
  );
  gw.setText(new OpenAITextProvider({ apiKey: config.ai.openaiKey, model: config.ai.openaiTextModel }));
  gw.setVision(new MockVisionProvider());
  gw.setModeration(new OpenAIModerationProvider({ apiKey: config.ai.openaiKey }));
  return gw;
}

const queueConfig = {
  mode: config.queue.mode,
  region: config.queue.region,
  ...(config.queue.endpoint ? { endpoint: config.queue.endpoint } : {}),
  ...(config.storage.accessKeyId ? { accessKeyId: config.storage.accessKeyId } : {}),
  ...(config.storage.secretAccessKey ? { secretAccessKey: config.storage.secretAccessKey } : {}),
};

const baseAdapters = createAdapters(config);
const adapters = {
  ...baseAdapters,
  queue: createQueueAdapter(queueConfig),
  ai: config.ai.mode === "real" ? buildRealAI(baseAdapters.storage) : buildMockAI(),
};

const generationWorker = new GenerationWorker(config, adapters);
const captionWorker = new CaptionWorker(config, adapters);

console.warn(
  "worker starting; queue:",
  config.queue.mode,
  config.queue.generationsQueue,
  "| captions:",
  config.queue.captionsQueue,
  "| ai:",
  config.ai.mode === "real"
    ? `real (${config.ai.openaiImageModel}, ${config.ai.openaiTextModel})`
    : "mock (sample images, 4-10s delay)",
);

while (true) {
  const [generationMessages, captionMessages] = await Promise.all([
    adapters.queue.receive<{
      generationId: string;
      variantId: string;
      workspaceId: string;
    }>(config.queue.generationsQueue, 5),
    adapters.queue.receive<{
      jobId: string;
      workspaceId: string;
    }>(config.queue.captionsQueue, 5),
  ]);

  adapters.telemetry.metric("queue.depth", generationMessages.length, { queue: "generations" });
  adapters.telemetry.metric("queue.depth", captionMessages.length, { queue: "captions" });

  for (const m of generationMessages) {
    try {
      await generationWorker.handle(m.body);
      await adapters.queue.delete(config.queue.generationsQueue, m.receiptHandle);
    } catch (e) {
      adapters.telemetry.captureException(e, { variantId: m.body.variantId });
      console.error("generation worker error", e);
    }
  }

  for (const m of captionMessages) {
    try {
      await captionWorker.handle(m.body);
      await adapters.queue.delete(config.queue.captionsQueue, m.receiptHandle);
    } catch (e) {
      adapters.telemetry.captureException(e, { captionJobId: m.body.jobId });
      console.error("caption worker error", e);
    }
  }

  if (generationMessages.length === 0 && captionMessages.length === 0) {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
