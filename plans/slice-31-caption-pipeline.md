# Slice 31 — Caption pipeline

**Phase:** 9 — Captions
**Depends on:** 19, 21
**Spec references:** [Spec § 3.6 (Caption generation)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `CaptionApi.create({ workspaceId, userId, input })` reserves credits, inserts `caption_jobs`, enqueues SQS message
- Worker handler `handleCaption(job)` calls `AIProvider.generateText` (Anthropic Claude Haiku) and stores result
- Length tier mapping: short=1 cr, medium=3 cr, long=5 cr
- Tests cover full happy path + insufficient-credits

---

## Files

**Create:**
- `packages/api/src/caption.ts`
- `packages/api/src/caption.test.ts`
- `packages/db/src/queries/caption.ts`
- `apps/worker/src/caption-handler.ts`

---

## Tasks

- [ ] **Step 1 — DB queries**

```ts
// packages/db/src/queries/caption.ts
import { eq, sql } from "drizzle-orm";
import type { Db } from "../client.js";
import { captionJobs } from "../schema/index.js";
import { withWorkspace } from "../with-workspace.js";

export async function insertCaption(db: Db, workspaceId: string, v: typeof captionJobs.$inferInsert) {
  return withWorkspace(db, workspaceId, async (tx) => {
    const [r] = await tx.insert(captionJobs).values(v).returning();
    return r;
  });
}

export async function updateCaption(db: Db, workspaceId: string, id: string, patch: Partial<typeof captionJobs.$inferInsert>) {
  return withWorkspace(db, workspaceId, async (tx) =>
    tx.update(captionJobs).set({ ...patch, completedAt: sql`now()` }).where(eq(captionJobs.id, id)));
}
```

- [ ] **Step 2 — Caption API**

```ts
// packages/api/src/caption.ts
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createDb, insertCaption } from "@vyora/db";
import { Ledger } from "@vyora/billing";
import type { Adapters, Config } from "@vyora/shared";

const COSTS = { short: 1, medium: 3, long: 5 } as const;

const Input = z.object({
  generationId: z.string().uuid().optional(),
  brief: z.string().min(1).max(500),
  voice: z.string().max(500).optional(),
  lengthTier: z.enum(["short", "medium", "long"]),
});

export class CaptionApi {
  constructor(private readonly config: Config, private readonly adapters: Adapters) {}
  private db(role: "app_user"|"app_admin" = "app_user") { return createDb(this.config.db.url, role); }

  async create(args: { workspaceId: string; userId: string; input: unknown }) {
    const v = Input.parse(args.input);
    const cost = COSTS[v.lengthTier];
    const id = randomUUID();
    const ledger = new Ledger(this.db("app_admin"));
    await ledger.reserve({ workspaceId: args.workspaceId, amount: cost, idempotencyKey: `cap-reserve-${id}`, captionJobId: id });

    await insertCaption(this.db(), args.workspaceId, {
      id, workspaceId: args.workspaceId,
      generationId: v.generationId ?? null,
      brief: v.brief, voice: v.voice ?? null, lengthTier: v.lengthTier, creditCost: cost,
    } as never);

    await this.adapters.queue.send(this.config.queue.captionsQueue, { jobId: id, workspaceId: args.workspaceId }, { idempotencyKey: id });
    return { jobId: id, status: "pending" as const, reservedCredits: cost };
  }
}
```

- [ ] **Step 3 — Worker**

```ts
// apps/worker/src/caption-handler.ts
import { eq, sql } from "drizzle-orm";
import { createDb, captionJobs } from "@vyora/db";
import { Ledger } from "@vyora/billing";
import { updateCaption } from "@vyora/db";
import type { Adapters, Config } from "@vyora/shared";

const TARGET_TOKENS = { short: 80, medium: 200, long: 500 };

export class CaptionWorker {
  constructor(private readonly config: Config, private readonly adapters: Adapters) {}

  async handle(job: { jobId: string; workspaceId: string }): Promise<void> {
    const dbAdmin = createDb(this.config.db.url, "app_admin");
    const [j] = await dbAdmin.select().from(captionJobs).where(eq(captionJobs.id, job.jobId));
    if (!j || j.status === "completed" || j.status === "failed") return;

    await dbAdmin.update(captionJobs).set({ status: "running" }).where(eq(captionJobs.id, job.jobId));

    try {
      const r = await this.adapters.ai.generateText({
        modelCode: "claude-haiku-4-5",
        systemPrompt: "You write social-media captions in markdown. Keep voice consistent, follow the brand voice notes if provided. Avoid hashtags unless the brief says otherwise.",
        prompt: `Brand voice: ${j.voice ?? "neutral, professional"}\n\nBrief: ${j.brief}\n\nWrite a ${j.lengthTier} caption.`,
        maxTokens: TARGET_TOKENS[j.lengthTier as keyof typeof TARGET_TOKENS],
      });

      await updateCaption(dbAdmin, j.workspaceId, j.id, { status: "completed", outputText: r.text });
      const ledger = new Ledger(dbAdmin);
      await ledger.commit({ workspaceId: j.workspaceId, amount: j.creditCost, idempotencyKey: `cap-commit-${j.id}`, captionJobId: j.id });
    } catch (e) {
      await updateCaption(dbAdmin, j.workspaceId, j.id, { status: "failed", errorPayload: { message: String(e) } });
      const ledger = new Ledger(dbAdmin);
      await ledger.release({ workspaceId: j.workspaceId, amount: j.creditCost, idempotencyKey: `cap-release-${j.id}`, captionJobId: j.id });
    }
  }
}
```

- [ ] **Step 4 — Tests + commit**

```bash
pnpm test:unit
git add -A
git commit -m "feat(api/worker): caption pipeline (Anthropic Haiku) with credit reservation/commit"
```

---

## Verification

```bash
pnpm --filter @vyora/api test
```

## Commit message

```
feat(api/worker): caption pipeline (Anthropic Haiku) with credit reservation/commit
```
