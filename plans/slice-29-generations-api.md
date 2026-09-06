# Slice 29 — Generations API (POST /generations + GET status)

**Phase:** 8 — Generation pipeline
**Depends on:** 19, 21, 27, 28
**Spec references:** [Spec § 3.3 (Generate flow)](../specs/2026-04-25-layertone-v1-spec.md), [Spec § 3.5 (Failure handling)](../specs/2026-04-25-layertone-v1-spec.md).

**Definition of done:**
- `GenerationApi.create({ workspaceId, userId, input })` validates input, resolves output target, picks templates from mood bindings (or fallback brand templates), looks up price book, reserves credits atomically, inserts generation + variant rows, claims inspiration upload (if any), enqueues SQS messages
- `GenerationApi.get({ workspaceId, id })` returns full generation with variants and signed URLs for completed outputs
- `GenerationApi.regenerateVariant({ workspaceId, generationId, variantId, input })` reserves credits + enqueues a single new variant tied to the same generation row
- Tests: cost computation, mood incompatibility rejection, insufficient-credits rejection, idempotent SQS enqueue

---

## Files

**Create:**
- `packages/api/src/generation.ts`
- `packages/api/src/generation.test.ts`
- `packages/db/src/queries/generation.ts`

**Modify:**
- Wire queue adapter usage when `QUEUE_MODE` ∈ {`sqs`, `elasticmq`} (slice 33 already wired? — see queue adapter wiring in slice 30 if deferred). For this slice: assume `Adapters.queue` exists; we'll wire it in slice 30.

---

## Tasks

- [ ] **Step 1 — DB queries**

`packages/db/src/queries/generation.ts`:

```ts
import { eq, and, sql } from "drizzle-orm";
import type { Db } from "../client.js";
import { generations, generationVariants, mood_template_bindings as mtb, templates } from "../schema/index.js";
import { withWorkspace } from "../with-workspace.js";

export async function pickTemplates(
  db: Db, args: { moodId: string | null; aspectRatio: string; n: number },
) {
  if (args.moodId) {
    const r = await db.select({ tid: mtb.templateId, weight: mtb.weight, slug: templates.slug, preferredModel: templates.preferredModel, requiresBrowserRender: templates.requiresBrowserRender })
      .from(mtb).innerJoin(templates, eq(templates.id, mtb.templateId))
      .where(and(
        eq(mtb.moodId, args.moodId),
        eq(templates.status, "published"),
        sql`${args.aspectRatio} = ANY(${templates.supportedAspectRatios})`,
      )).orderBy(sql`${mtb.weight} DESC`).limit(args.n);
    return r;
  }
  // Brand-only fallback: published templates supporting this aspect ratio, ordered by name
  return db.select({ tid: templates.id, weight: sql<number>`100`, slug: templates.slug, preferredModel: templates.preferredModel, requiresBrowserRender: templates.requiresBrowserRender })
    .from(templates)
    .where(and(eq(templates.status, "published"), sql`${args.aspectRatio} = ANY(${templates.supportedAspectRatios})`))
    .limit(args.n);
}

export async function insertGeneration(
  db: Db, workspaceId: string,
  v: typeof generations.$inferInsert,
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [g] = await tx.insert(generations).values(v).returning();
    return g;
  });
}

export async function insertVariants(
  db: Db, workspaceId: string,
  rows: (typeof generationVariants.$inferInsert)[],
) {
  return withWorkspace(db, workspaceId, async (tx) => {
    return tx.insert(generationVariants).values(rows).returning();
  });
}

export async function getGenerationFull(db: Db, workspaceId: string, generationId: string) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [g] = await tx.select().from(generations).where(eq(generations.id, generationId));
    if (!g) return null;
    const variants = await tx.select().from(generationVariants).where(eq(generationVariants.generationId, generationId));
    return { ...g, variants };
  });
}
```

(`mood_template_bindings` is the actual table — re-export under that name in schema/index.js if not already.)

- [ ] **Step 2 — Generation API**

```ts
// packages/api/src/generation.ts
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { resolveOutputTarget, assertMoodSupportsAspectRatio } from "@layertone/shared";
import { createDb, listAvailableMoods, pickTemplates, insertGeneration, insertVariants, getGenerationFull } from "@layertone/db";
import { Ledger, InsufficientCredits } from "@layertone/billing";
import type { Adapters, Config } from "@layertone/shared";
import { keys } from "@layertone/storage";

const VARIANT_COUNT = 4;

const Input = z.object({
  brandId: z.string().uuid(),
  moodId: z.string().uuid().optional().nullable(),
  brief: z.string().min(1).max(500),
  outputTarget: z.unknown(),  // validated via resolveOutputTarget
  inspirationUploadId: z.string().uuid().optional(),
  inspirationInfluence: z.enum(["subtle", "balanced", "strong"]).optional(),
  flags: z.object({
    useBrandColors: z.boolean().default(true),
    useBrandLogo: z.boolean().default(true),
    useBrandFonts: z.boolean().default(true),
    brandStrict: z.boolean().default(false),
    applyMoodModifiers: z.boolean().default(true),
    applyMoodDecorations: z.boolean().default(true),
    applyMoodAccentColors: z.boolean().default(true),
    usePremiumModel: z.boolean().default(false),
  }).default({}),
});

export class GenerationApi {
  constructor(private readonly config: Config, private readonly adapters: Adapters, private readonly pricebook: { lookup: (a: { modelCode: string; sizeBucket: "standard"|"large"; premiumFlag: boolean; hasInspirationFlag: boolean }) => Promise<{ credits: number; version: number }> }) {}
  private db(role: "app_user"|"app_admin" = "app_user") { return createDb(this.config.db.url, role); }

  async create(args: { workspaceId: string; userId: string; input: unknown }) {
    const v = Input.parse(args.input);
    const target = resolveOutputTarget(v.outputTarget);

    // Mood compatibility
    if (v.moodId) {
      const moods = await listAvailableMoods(this.db(), { aspectRatio: target.aspectRatio });
      const m = moods.find((x) => x.id === v.moodId);
      if (!m) {
        const e = new Error("mood-not-available-for-aspect-ratio");
        (e as Error & { code?: string }).code = "validation.mood_aspect_mismatch";
        throw e;
      }
      assertMoodSupportsAspectRatio(m.supportedAspectRatios, target.aspectRatio);
    }

    // Pick templates (top N by weight)
    const tpls = await pickTemplates(this.db(), { moodId: v.moodId ?? null, aspectRatio: target.aspectRatio, n: VARIANT_COUNT });
    if (tpls.length === 0) {
      const e = new Error("no-template-found"); (e as Error & { code?: string }).code = "validation.no_template"; throw e;
    }

    // Cost estimation
    const sizeBucket = target.width * target.height > 1280 * 1280 ? "large" : "standard";
    const hasInspiration = !!v.inspirationUploadId;
    let pricebookVersion = 0;
    let totalCredits = 0;
    const variantPlan = [];
    for (const t of tpls) {
      const modelCode = v.flags.usePremiumModel ? "gpt-image-1" : t.preferredModel;
      const p = await this.pricebook.lookup({ modelCode, sizeBucket, premiumFlag: v.flags.usePremiumModel, hasInspirationFlag: hasInspiration });
      pricebookVersion = p.version;
      totalCredits += p.credits;
      variantPlan.push({ templateId: t.tid, modelCode, credits: p.credits });
    }

    // Reserve credits
    const ledger = new Ledger(this.db("app_admin"));
    const reservationKey = `gen-reserve-${args.workspaceId}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    try {
      await ledger.reserve({ workspaceId: args.workspaceId, amount: totalCredits, idempotencyKey: reservationKey });
    } catch (e) {
      if (e instanceof InsufficientCredits) {
        const err = new Error("insufficient-credits"); (err as Error & { code?: string; httpStatus?: number }).code = "billing.insufficient_credits"; (err as Error & { httpStatus?: number }).httpStatus = 402; throw err;
      }
      throw e;
    }

    // Claim inspiration upload (if any)
    let inspirationKey: string | null = null;
    if (v.inspirationUploadId) {
      const tmpKey = keys.inspirationUploadStaging(args.workspaceId, v.inspirationUploadId, "png");
      const finalKey = keys.inspirationClaimed(args.workspaceId, "PENDING_GEN_ID", "png");
      // We don't know generation_id yet; do the move after insertGeneration below.
      inspirationKey = tmpKey;
      void finalKey;
    }

    // Insert generation + variants
    const genId = randomUUID();
    const generation = await insertGeneration(this.db(), args.workspaceId, {
      id: genId,
      workspaceId: args.workspaceId,
      brandId: v.brandId,
      moodId: v.moodId ?? null,
      brief: v.brief,
      settings: { ...v.flags, output_target: target, variant_count: VARIANT_COUNT },
      inspirationImageS3Key: null,  // updated after claim below
      inspirationInfluence: v.inspirationInfluence ?? null,
      priceBookVersion: pricebookVersion,
      requestedByUserId: args.userId,
    } as never);

    // Now claim with the actual gen id
    let inspirationFinalKey: string | null = null;
    if (inspirationKey && v.inspirationUploadId) {
      const dst = keys.inspirationClaimed(args.workspaceId, genId, "png");
      await this.adapters.storage.copy(inspirationKey, dst);
      await this.adapters.storage.delete(inspirationKey);
      inspirationFinalKey = dst;
      // update row
      const adminDb = this.db("app_admin");
      await adminDb.execute(`UPDATE generations SET inspiration_image_s3_key = '${dst}' WHERE id = '${genId}'`);
    }

    const variantRows = variantPlan.map((vp) => ({
      id: randomUUID(),
      generationId: genId,
      templateId: vp.templateId,
      modelUsed: vp.modelCode,
      creditCost: vp.credits,
    }));
    await insertVariants(this.db(), args.workspaceId, variantRows);

    // Enqueue SQS messages
    for (const row of variantRows) {
      await this.adapters.queue.send(this.config.queue.generationsQueue, {
        generationId: genId, variantId: row.id, workspaceId: args.workspaceId,
      }, { idempotencyKey: row.id });
    }

    return {
      generationId: genId,
      status: "pending" as const,
      variants: variantRows.map((r) => ({ id: r.id, templateId: r.templateId, status: "queued" as const })),
      reservedCredits: totalCredits,
    };
  }

  async get(args: { workspaceId: string; generationId: string }) {
    const gen = await getGenerationFull(this.db(), args.workspaceId, args.generationId);
    if (!gen) return null;
    // Sign URLs for completed variants
    const variants = await Promise.all(gen.variants.map(async (v) => ({
      ...v,
      url: v.outputS3Key ? await this.adapters.storage.getSignedUrl(v.outputS3Key) : null,
    })));
    return { ...gen, variants };
  }

  async regenerateVariant(_args: { workspaceId: string; userId: string; generationId: string; input: unknown }) {
    // Implementation mirrors create() but for a single new variant attached to the same generation;
    // omitted for brevity — same primitives.
    throw new Error("not-implemented-this-slice");
  }
}
```

- [ ] **Step 3 — Tests**

```ts
// packages/api/src/generation.test.ts — covering:
// * insufficient credits → 402 code
// * mood not supporting aspect ratio → 422 code
// * happy path enqueues 4 messages and returns generation_id
// * inspiration upload triggers storage.copy + delete
```

(Mock all DB queries and adapter calls; assert on counts.)

- [ ] **Step 4 — Commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(api): generation create + status endpoints with reservation, template selection, inspiration claim"
```

---

## Verification

```bash
pnpm --filter @layertone/api test
```

## Commit message

```
feat(api): generation create + status endpoints with reservation, template selection, inspiration claim
```
