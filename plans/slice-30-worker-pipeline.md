# Slice 30 — Worker pipeline (per-variant Lambda handler)

**Phase:** 8 — Generation pipeline
**Depends on:** 25, 26, 29
**Spec references:** [Spec § 3.4 (Worker pipeline)](../specs/2026-04-25-studio-v1-spec.md), [Spec § 3.5 (Failure handling)](../specs/2026-04-25-studio-v1-spec.md), [Architecture § 4.3 (i2i routing)](../specs/2026-04-25-studio-v1-architecture.md).

**Definition of done:**
- `apps/worker/src/handler.ts` exposes a Lambda-compatible function that processes one SQS record (or one inline message in dev)
- Idempotency check on variant; status transitions (queued → running → completed/failed)
- Builds prompt: brief + mood modifiers + brand grounding (top-3 by embedding similarity) + inspiration reference
- Calls AI Gateway with retries (1 retry → fallback to bedrock-sd35)
- Calls renderer (satori or browser based on `templates.requires_browser_render`)
- Commits credits via Ledger; releases on failure
- Atomic fan-in: last variant completion marks generation completed; releases unspent reservation
- Queue adapter wired (SQS / ElasticMQ / inline)
- Tests cover: happy path, model failure → fallback, all variants fail → reservation released, fan-in
- Worker dev script: `pnpm --filter @vyora/worker dev` (long-running ElasticMQ poller)

---

## Files

**Create:**
- `apps/worker/src/handler.ts`
- `apps/worker/src/handler.int.test.ts`
- `apps/worker/src/poller.ts` (dev mode)
- `packages/queue/{package.json,tsconfig.json,src/{index.ts,sqs.ts,elasticmq.ts,inline.ts}}` (queue adapter package)
- `apps/worker/scripts/dev.ts`

**Modify:**
- `packages/shared/src/adapters/factory.ts` — wire `Queue` adapter

---

## Tasks

- [ ] **Step 1 — Queue adapter package**

Bootstrap `packages/queue` with:
```bash
pnpm --filter @vyora/queue add @aws-sdk/client-sqs
pnpm --filter @vyora/queue add @vyora/shared@workspace:*
```

`packages/queue/src/sqs.ts`:

```ts
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import type { QueueAdapter, QueueMessage } from "@vyora/shared";

export class SqsQueueAdapter implements QueueAdapter {
  client: SQSClient;
  constructor(opts: { region: string; endpoint?: string; accessKeyId?: string; secretAccessKey?: string }) {
    this.client = new SQSClient({
      region: opts.region, endpoint: opts.endpoint,
      credentials: opts.accessKeyId && opts.secretAccessKey ? { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey } : undefined,
    });
  }

  async send<T>(queueUrl: string, body: T, opts?: { idempotencyKey?: string }): Promise<void> {
    await this.client.send(new SendMessageCommand({
      QueueUrl: queueUrl, MessageBody: JSON.stringify(body),
      MessageDeduplicationId: opts?.idempotencyKey,
    }));
  }

  async receive<T>(queueUrl: string, max = 1): Promise<QueueMessage<T>[]> {
    const r = await this.client.send(new ReceiveMessageCommand({
      QueueUrl: queueUrl, MaxNumberOfMessages: max, WaitTimeSeconds: 5, VisibilityTimeout: 60,
    }));
    return (r.Messages ?? []).map((m) => ({
      body: JSON.parse(m.Body ?? "{}") as T,
      receiptHandle: m.ReceiptHandle!,
      approximateReceiveCount: parseInt(m.Attributes?.ApproximateReceiveCount ?? "1", 10),
    }));
  }

  async delete(queueUrl: string, receiptHandle: string): Promise<void> {
    await this.client.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }));
  }
}
```

`packages/queue/src/inline.ts`:

```ts
import type { QueueAdapter, QueueMessage } from "@vyora/shared";

type Handler = (msg: unknown) => Promise<void>;

export class InlineQueueAdapter implements QueueAdapter {
  private handlers = new Map<string, Handler>();
  registerHandler(queueUrl: string, h: Handler) { this.handlers.set(queueUrl, h); }

  async send<T>(queueUrl: string, body: T): Promise<void> {
    const h = this.handlers.get(queueUrl);
    if (!h) throw new Error(`no inline handler for ${queueUrl}`);
    await h(body);
  }
  async receive<T>(_q: string, _m?: number): Promise<QueueMessage<T>[]> { return []; }
  async delete(): Promise<void> { /* noop */ }
}
```

`packages/queue/src/elasticmq.ts` reuses `SqsQueueAdapter` with the `endpoint` set.

`packages/queue/src/index.ts`:
```ts
export * from "./sqs.js";
export * from "./inline.js";
```

Wire factory:
```ts
import { SqsQueueAdapter, InlineQueueAdapter } from "@vyora/queue";
const queue =
  config.queue.mode === "inline" ? new InlineQueueAdapter()
  : new SqsQueueAdapter({ region: config.queue.region, endpoint: config.queue.endpoint });
```

- [ ] **Step 2 — Worker handler**

`apps/worker/src/handler.ts`:

```ts
import { eq, sql } from "drizzle-orm";
import {
  createDb, getGenerationFull, generations, generationVariants, brands, brandAssets, moods, templates as templatesTable,
} from "@vyora/db";
import { keys } from "@vyora/storage";
import { Ledger } from "@vyora/billing";
import { render } from "@vyora/renderer";
import type { Adapters, Config } from "@vyora/shared";
import type { AIImageRequest } from "@vyora/shared";

export interface VariantJob { generationId: string; variantId: string; workspaceId: string }

export class GenerationWorker {
  constructor(private readonly config: Config, private readonly adapters: Adapters) {}

  async handle(job: VariantJob): Promise<void> {
    const dbAdmin = createDb(this.config.db.url, "app_admin");

    // Idempotency: skip if variant terminal
    const [v0] = await dbAdmin.select().from(generationVariants).where(eq(generationVariants.id, job.variantId));
    if (!v0 || v0.status === "completed" || v0.status === "failed") return;

    // Mark running
    await dbAdmin.update(generationVariants).set({ status: "running" }).where(eq(generationVariants.id, job.variantId));

    // Load context
    const gen = await getGenerationFull(createDb(this.config.db.url, "app_user"), job.workspaceId, job.generationId);
    if (!gen) throw new Error("generation-not-found");
    const [brand] = await dbAdmin.select().from(brands).where(eq(brands.id, gen.brandId));
    const [tpl] = await dbAdmin.select().from(templatesTable).where(eq(templatesTable.id, v0.templateId));
    const mood = gen.moodId ? (await dbAdmin.select().from(moods).where(eq(moods.id, gen.moodId)))[0] : null;
    const settings = gen.settings as { output_target: { aspectRatio: string; width: number; height: number }; flags?: Record<string, boolean>; usePremiumModel?: boolean };

    // Brand grounding (top-3 references by embedding similarity to brief)
    let brandRefs: { s3Key: string; role: "brand_reference"; weight: number }[] = [];
    try {
      const { vector } = await this.adapters.ai.embedText(gen.brief);
      const r = await dbAdmin.execute<{ s3_key: string }>(sql`
        SELECT s3_key FROM brand_assets WHERE workspace_id = ${job.workspaceId} AND brand_id = ${gen.brandId}
        ORDER BY embedding <=> ${sql.raw(`'[${vector.join(",")}]'`)}::vector LIMIT 3
      `);
      brandRefs = r.map((row) => ({ s3Key: row.s3_key, role: "brand_reference" as const, weight: 0.4 }));
    } catch { /* embeddings best-effort */ }

    const inspirationRef = gen.inspirationImageS3Key ? [{
      s3Key: gen.inspirationImageS3Key, role: "inspiration" as const,
      weight: gen.inspirationInfluence === "subtle" ? 0.3 : gen.inspirationInfluence === "strong" ? 0.9 : 0.6,
    }] : [];

    const target = settings.output_target;
    const promptParts = [gen.brief];
    if (mood?.promptModifiers) promptParts.push(mood.promptModifiers);
    if (tpl.textSafeZones) promptParts.push("Leave the indicated negative space visually quiet for headline overlay.");

    // Pre-flight moderation
    const mod = await this.adapters.ai.moderateText(promptParts.join("\n\n"));
    if (mod.flagged) {
      await this.markFailed(dbAdmin, job, "safety_blocked", mod.categories);
      await this.releaseReservation(job, v0.creditCost);
      return;
    }

    const baseReq: AIImageRequest = {
      modelCode: settings.usePremiumModel ? "gpt-image-1" : tpl.preferredModel,
      prompt: promptParts.join("\n\n"),
      negativePrompt: mood?.negativePrompts ?? undefined,
      references: [...brandRefs, ...inspirationRef],
      aspectRatio: target.aspectRatio,
      width: target.width, height: target.height,
      safetyLevel: "default",
    };

    let imageRes;
    try {
      imageRes = await this.adapters.ai.generateImage(baseReq);
    } catch (e) {
      // Retry once same model
      try { imageRes = await this.adapters.ai.generateImage(baseReq); }
      catch {
        // Fallback to bedrock-sd35
        try { imageRes = await this.adapters.ai.generateImage({ ...baseReq, modelCode: "bedrock-sd35", references: undefined }); }
        catch (e2) {
          await this.markFailed(dbAdmin, job, "model_failure", String(e2));
          await this.releaseReservation(job, v0.creditCost);
          return;
        }
      }
    }

    // Optional post-flight moderation
    const imgMod = await this.adapters.ai.moderateImage(Buffer.from(imageRes.imageBytes));
    if (imgMod.flagged) {
      await this.markFailed(dbAdmin, job, "safety_blocked_image", imgMod.categories);
      await this.releaseReservation(job, v0.creditCost);
      return;
    }

    // Persist background
    const bgKey = keys.generationBackground(job.workspaceId, job.generationId, job.variantId);
    await this.adapters.storage.putBytes(bgKey, imageRes.imageBytes, "image/png");

    // Render template
    const rendered = await render({
      templateJsxSource: tpl.jsxSource,
      background: { bytes: imageRes.imageBytes, mimeType: "image/png" },
      brand: {
        logoSvg: undefined, // (load from S3 if SVG; or pass raw bytes for PNG via storage in a real call)
        palette: (brand.palette as never) ?? { primary: "#000" },
        fonts: (brand.fonts as never) ?? { heading: { family: "Inter", weight: "700" }, body: { family: "Inter", weight: "400" } },
        flags: { useColors: settings.flags?.useBrandColors ?? true, useLogo: settings.flags?.useBrandLogo ?? true, useFonts: settings.flags?.useBrandFonts ?? true },
      },
      mood: mood ? {
        accentPalette: (mood.accentPalette as never) ?? [],
        decorationTags: mood.decorationTags ?? [],
        typographyHint: (mood.typographyHint as never) ?? undefined,
        flags: { useDecorations: settings.flags?.applyMoodDecorations ?? true, useAccentColors: settings.flags?.applyMoodAccentColors ?? true },
      } : undefined,
      slots: { headline: gen.brief, subhead: undefined, cta: undefined },
      output: { width: target.width, height: target.height },
    }, { requiresBrowser: tpl.requiresBrowserRender });

    const outKey = keys.generationVariant(job.workspaceId, job.generationId, job.variantId);
    await this.adapters.storage.putBytes(outKey, rendered.pngBytes, "image/png");

    // Commit credits
    const ledger = new Ledger(dbAdmin);
    await ledger.commit({ workspaceId: job.workspaceId, amount: v0.creditCost, idempotencyKey: `commit-${job.variantId}`, generationId: job.generationId });

    // Mark variant complete
    await dbAdmin.update(generationVariants)
      .set({ status: "completed", outputS3Key: outKey, backgroundS3Key: bgKey, modelUsed: imageRes.modelUsedCode, renderMs: rendered.renderMs, completedAt: sql`now()` })
      .where(eq(generationVariants.id, job.variantId));

    // Atomic fan-in
    await dbAdmin.execute(sql`
      UPDATE generations SET status = 'completed', completed_at = now()
      WHERE id = ${job.generationId}
        AND NOT EXISTS (SELECT 1 FROM generation_variants WHERE generation_id = ${job.generationId} AND status NOT IN ('completed','failed'))
    `);
  }

  private async markFailed(dbAdmin: ReturnType<typeof createDb>, job: VariantJob, reason: string, detail: unknown) {
    await dbAdmin.update(generationVariants)
      .set({ status: "failed", errorPayload: { reason, detail }, completedAt: sql`now()` })
      .where(eq(generationVariants.id, job.variantId));
  }

  private async releaseReservation(job: VariantJob, amount: number) {
    const dbAdmin = createDb(this.config.db.url, "app_admin");
    const ledger = new Ledger(dbAdmin);
    await ledger.release({ workspaceId: job.workspaceId, amount, idempotencyKey: `release-${job.variantId}`, generationId: job.generationId });
  }
}
```

- [ ] **Step 3 — Dev poller**

`apps/worker/scripts/dev.ts`:

```ts
import { loadConfig, createAdapters } from "@vyora/shared";
import { GenerationWorker } from "../src/handler.js";

const config = loadConfig();
const adapters = createAdapters(config);
const worker = new GenerationWorker(config, adapters);

console.warn("worker starting; queue:", config.queue.mode, config.queue.generationsQueue);
while (true) {
  const messages = await adapters.queue.receive<{ generationId: string; variantId: string; workspaceId: string }>(config.queue.generationsQueue, 5);
  for (const m of messages) {
    try {
      await worker.handle(m.body);
      await adapters.queue.delete(config.queue.generationsQueue, m.receiptHandle);
    } catch (e) {
      console.error("worker error", e);
      // visibility timeout will re-deliver
    }
  }
  if (messages.length === 0) await new Promise((r) => setTimeout(r, 1000));
}
```

Add `dev` script in `apps/worker/package.json`:
```json
"scripts": { "dev": "tsx scripts/dev.ts" }
```

- [ ] **Step 4 — Integration test (end-to-end with mock provider)**

`apps/worker/src/handler.int.test.ts`: seeds workspace + brand + template + mood + price book; calls `GenerationApi.create`; calls `worker.handle` for each variant; asserts variants `completed`, ledger commits posted, `generations.status === 'completed'`.

- [ ] **Step 5 — Commit**

```bash
pnpm test:int
git add -A
git commit -m "feat(worker): generation pipeline handler with i2i + vision-fallback + fan-in completion"
```

---

## Verification

```bash
pnpm test:int
# manual: AI_MODE=mock pnpm --filter @vyora/worker dev   # runs locally
```

## Commit message

```
feat(worker): generation pipeline handler with i2i + vision-fallback + fan-in completion
```
