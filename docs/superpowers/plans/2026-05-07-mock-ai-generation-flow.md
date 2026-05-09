# Mock AI Generation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the full production generation flow using a realistic `MockImageProvider` that returns sample images with simulated OpenAI latency instead of colored rectangles, so the "Start generation" button shows the real `GenerationView` polling experience without an API key.

**Architecture:** The `MockImageProvider` in `packages/gateway` is enhanced to read one of four sample PNGs (resized to requested dimensions via `sharp`) after a configurable random delay. The worker's `dev.ts` script, which currently leaves the `ai` adapter unwired, is updated to build a `Gateway` with all mock providers when `AI_MODE=mock`. No frontend changes are needed — the `GenerationView` polling loop, skeleton states, and fade-in animations all work on the existing real flow.

**Tech Stack:** Node.js ESM, TypeScript, `sharp` (already in `@vyora/gateway` deps), `@vyora/gateway` Gateway class, vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/gateway/samples/sample-{0-3}.png` | Create (copy) | Sample images served by MockImageProvider |
| `packages/gateway/src/mock.ts` | Modify | Add delay + sample image reading to MockImageProvider |
| `apps/worker/scripts/dev.ts` | Modify | Build and inject Gateway with MockImageProvider |

---

### Task 1: Copy sample images into the gateway package

**Files:**
- Create: `packages/gateway/samples/sample-0.png`
- Create: `packages/gateway/samples/sample-1.png`
- Create: `packages/gateway/samples/sample-2.png`
- Create: `packages/gateway/samples/sample-3.png`

- [ ] **Step 1: Copy and rename the four sample images**

```bash
mkdir -p packages/gateway/samples
cp "sample_images/ChatGPT Image May 7, 2026, 01_23_37 AM (1).png" packages/gateway/samples/sample-0.png
cp "sample_images/ChatGPT Image May 7, 2026, 01_23_37 AM (2).png" packages/gateway/samples/sample-1.png
cp "sample_images/ChatGPT Image May 7, 2026, 01_23_51 AM (1).png" packages/gateway/samples/sample-2.png
cp "sample_images/ChatGPT Image May 7, 2026, 01_23_51 AM (2).png" packages/gateway/samples/sample-3.png
```

Expected: four files at `packages/gateway/samples/`, ~1.5–2 MB each.

- [ ] **Step 2: Verify the copies landed**

```bash
ls -lh packages/gateway/samples/
```

Expected output: four `sample-N.png` files, total ~7 MB.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/samples/
git commit -m "chore(gateway): add sample images for mock image provider"
```

---

### Task 2: Update MockImageProvider with delay + sample images

**Files:**
- Modify: `packages/gateway/src/mock.ts`

- [ ] **Step 1: Write the failing test**

Add a new `describe` block at the bottom of `packages/gateway/src/gateway.test.ts`:

```typescript
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// ... (existing imports stay)

describe("MockImageProvider with samples", () => {
  it("returns a PNG of the requested dimensions when samples exist", async () => {
    const samplesDir = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../samples",
    );
    if (!existsSync(samplesDir)) {
      // samples not present in this environment — skip
      return;
    }

    const provider = new MockImageProvider({ samplesDir });
    const res = await provider.generate({
      modelCode: "flux-1.1-pro",
      prompt: "a test prompt",
      aspectRatio: "1:1",
      width: 128,
      height: 128,
      safetyLevel: "default",
    });

    expect(res.imageBytes.byteLength).toBeGreaterThan(1000);
    expect(res.modelUsedCode).toBe("flux-1.1-pro");
  });

  it("falls back to colored square when samplesDir is missing", async () => {
    const provider = new MockImageProvider({ samplesDir: "/nonexistent/path" });
    const res = await provider.generate({
      modelCode: "flux-1.1-pro",
      prompt: "a test prompt",
      aspectRatio: "1:1",
      width: 64,
      height: 64,
      safetyLevel: "default",
    });

    expect(res.imageBytes.byteLength).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd packages/gateway && pnpm test --reporter=verbose 2>&1 | grep -A 5 "MockImageProvider with samples"
```

Expected: test errors because `MockImageProvider` does not accept `opts` yet.

- [ ] **Step 3: Replace MockImageProvider in `packages/gateway/src/mock.ts`**

Replace the entire file content with:

```typescript
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { promptFingerprint } from "./gateway.js";
import type { ImageProvider, TextProvider, VisionProvider, ModerationProvider } from "./types.js";
import type { AIImageRequest, AIImageResponse, AITextRequest, AITextResponse } from "@vyora/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SAMPLES_DIR = resolve(__dirname, "../samples");
const SAMPLE_COUNT = 4;

export class MockImageProvider implements ImageProvider {
  capabilities = {
    modelCodes: ["flux-1.1-pro", "gpt-image-1", "recraft-v3", "bedrock-sd35", "nova-canvas"],
    supportsImageToImage: true,
    supportsMultiReference: true,
    tier: "fast" as const,
  };

  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly samplesDir: string;

  constructor(opts: { minDelayMs?: number; maxDelayMs?: number; samplesDir?: string } = {}) {
    this.minDelayMs = opts.minDelayMs ?? 0;
    this.maxDelayMs = opts.maxDelayMs ?? 0;
    this.samplesDir = opts.samplesDir ?? DEFAULT_SAMPLES_DIR;
  }

  async generate(req: AIImageRequest): Promise<AIImageResponse> {
    if (this.maxDelayMs > 0) {
      const jitter = Math.random() * (this.maxDelayMs - this.minDelayMs);
      await new Promise<void>((r) => setTimeout(r, this.minDelayMs + jitter));
    }

    const fp = promptFingerprint(req);
    const idx = parseInt(fp.slice(0, 2), 16) % SAMPLE_COUNT;
    const samplePath = resolve(this.samplesDir, `sample-${idx}.png`);

    const png = existsSync(samplePath)
      ? await sharp(samplePath)
          .resize(req.width, req.height, { fit: "cover" })
          .png()
          .toBuffer()
      : await sharp({
          create: {
            width: req.width,
            height: req.height,
            channels: 3,
            background: {
              r: parseInt(fp.slice(0, 2), 16),
              g: parseInt(fp.slice(2, 4), 16),
              b: parseInt(fp.slice(4, 6), 16),
            },
          },
        })
          .png()
          .toBuffer();

    return {
      imageBytes: png,
      modelUsedCode: req.modelCode,
      upstreamCostCents: 0,
      latencyMs: this.maxDelayMs > 0 ? Math.round(this.minDelayMs + (this.maxDelayMs - this.minDelayMs) * 0.5) : 5,
      safetyFlags: [],
    };
  }
}

export class MockTextProvider implements TextProvider {
  modelCodes = ["claude-haiku-4-5"];

  async generate(req: AITextRequest): Promise<AITextResponse> {
    return {
      text: `(mock text for prompt: ${req.prompt.slice(0, 40)})`,
      upstreamCostCents: 0,
      latencyMs: 1,
    };
  }

  async embed(text: string): Promise<{ vector: number[] }> {
    const hash = text.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return { vector: Array.from({ length: 1536 }, (_, i) => Math.sin(i + hash)) };
  }
}

export class MockVisionProvider implements VisionProvider {
  async describeImageBytes(_bytes: Uint8Array): Promise<{ description: string }> {
    return { description: "(mock vision: soft-lit, minimal, neutral tones)" };
  }
}

export class MockModerationProvider implements ModerationProvider {
  async moderateText(_text: string) { return { flagged: false, categories: [] }; }
  async moderateImage(_bytes: Uint8Array) { return { flagged: false, categories: [] }; }
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
cd packages/gateway && pnpm test --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass including the two new `MockImageProvider with samples` tests.

- [ ] **Step 5: Run typecheck**

```bash
cd packages/gateway && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/mock.ts packages/gateway/src/gateway.test.ts
git commit -m "feat(gateway): MockImageProvider serves sample images with configurable delay"
```

---

### Task 3: Wire up mock AI gateway in the worker dev script

**Files:**
- Modify: `apps/worker/scripts/dev.ts`

- [ ] **Step 1: Replace `apps/worker/scripts/dev.ts` with the wired version**

```typescript
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
```

- [ ] **Step 2: Run typecheck on the worker**

```bash
cd apps/worker && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/worker/scripts/dev.ts
git commit -m "feat(worker): wire MockImageProvider into dev script for AI_MODE=mock"
```

---

### Task 4: Smoke test the full flow

This is a manual verification step — no code changes.

- [ ] **Step 1: Confirm the dev stack is running**

In separate terminals (or via the project's dev script):
- Web app: `pnpm dev` from `apps/web`
- Worker: `pnpm dev` from `apps/worker`
- ElasticMQ and MinIO must be up (via docker-compose or equivalent)

- [ ] **Step 2: Open the generate page and submit a generation**

1. Navigate to `/generate` in the browser
2. Fill in a brief (any text)
3. Click "Generate images" — the prompt preview dialog opens
4. Click "Start generation"
5. The browser should navigate to `/generations/<id>`

- [ ] **Step 3: Watch the generation progress**

Expected sequence on the results page:
- All variant cards show a skeleton (queued state)
- After a few seconds per variant: card transitions to the "Painting your background…" animation (running state)
- After 4–10 seconds: image fades in from the sample set (completed state)
- Status pill changes from "Generating · N of M ready" to "N of N ready" (green)

- [ ] **Step 4: Verify the worker log**

In the worker terminal, you should see log output as it picks up each job and simulates generation. No errors should appear.
