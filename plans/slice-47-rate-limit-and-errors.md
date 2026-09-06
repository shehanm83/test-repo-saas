# Slice 47 — Rate limiting + AppError + error code map

**Phase:** 16 — Hardening
**Depends on:** 12, 19
**Spec references:** [Spec § 7 (Rate limiting)](../specs/2026-04-25-layertone-v1-spec.md), [Spec § 8 (Errors)](../specs/2026-04-25-layertone-v1-spec.md).

**Definition of done:**
- `AppError` class in `@layertone/shared` with namespaced codes
- `rateLimit(key, limit, windowSec)` Postgres-backed function
- Per-user rate limit on `POST /api/generations` and `/api/uploads/inspiration` (10/min Free, scaled by tier)
- Per-workspace concurrent-generation cap (Free=1, Starter=2, Pro=4, Business=8, Agency=16)
- API responses use unified `{ error: { code, message, requestId } }` shape
- Client-side error code → friendly copy translation map

---

## Files

**Create:**
- `packages/shared/src/errors/app-error.ts`
- `packages/shared/src/errors/codes.ts`
- `packages/shared/src/errors/messages.ts`
- `packages/api/src/rate-limit.ts`
- `packages/api/src/concurrency.ts`
- `apps/web/src/lib/errors/translate.ts`
- DB migration: `0006_rate_limit_counters.sql`

---

## Tasks

- [ ] **Step 1 — `AppError`**

```ts
// packages/shared/src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly userMessage: string,
    public readonly httpStatus = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(`${code}: ${userMessage}`);
    this.name = "AppError";
  }
}
```

- [ ] **Step 2 — Codes + messages**

```ts
// packages/shared/src/errors/codes.ts
export const CODES = {
  AUTH_INVALID_SESSION: "auth.invalid_session",
  AUTH_INSUFFICIENT_ROLE: "auth.insufficient_role",
  BILLING_INSUFFICIENT_CREDITS: "billing.insufficient_credits",
  BILLING_WORKSPACE_READ_ONLY: "billing.workspace_read_only",
  GENERATION_MODEL_UNAVAILABLE: "generation.model_unavailable",
  GENERATION_TEMPLATE_NOT_FOUND: "generation.template_not_found",
  GENERATION_CONCURRENT_CAP: "generation.concurrent_cap",
  RATE_LIMIT_EXCEEDED: "rate_limit.exceeded",
  SAFETY_TEXT_BLOCKED: "safety.text_blocked",
  SAFETY_IMAGE_BLOCKED: "safety.image_blocked",
  VALIDATION_FAILED: "validation.failed",
  VALIDATION_FILE_TOO_LARGE: "validation.file_too_large",
  VALIDATION_INVALID_IMAGE: "validation.invalid_image",
  VALIDATION_MOOD_ASPECT_MISMATCH: "validation.mood_aspect_mismatch",
} as const;
```

- [ ] **Step 3 — Rate-limit table**

Migration `0006_rate_limit_counters.sql`:

```sql
CREATE TABLE rate_limit_counters (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX rate_limit_window_idx ON rate_limit_counters (window_start);
```

- [ ] **Step 4 — Rate limit function**

```ts
// packages/api/src/rate-limit.ts
import { sql } from "drizzle-orm";
import type { Db } from "@layertone/db";
import { AppError, CODES } from "@layertone/shared";

export async function rateLimit(db: Db, key: string, limit: number, windowSec: number): Promise<void> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000);
  const r = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit_counters (key, window_start, count)
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limit_counters.count + 1
    RETURNING count
  `);
  const c = r[0]?.count ?? 0;
  if (c > limit) {
    throw new AppError(CODES.RATE_LIMIT_EXCEEDED, "Too many requests, please slow down.", 429, { retryAfterSec: windowSec });
  }
}
```

- [ ] **Step 5 — Concurrent-generation cap**

```ts
// packages/api/src/concurrency.ts
import { and, eq, inArray } from "drizzle-orm";
import { type Db, generations } from "@layertone/db";
import { AppError, CODES } from "@layertone/shared";

const CAPS: Record<string, number> = { free: 1, starter: 2, pro: 4, business: 8, agency: 16 };

export async function assertGenerationCapacity(db: Db, workspaceId: string, planCode: string): Promise<void> {
  const cap = CAPS[planCode] ?? 1;
  const running = await db.select({ id: generations.id }).from(generations)
    .where(and(eq(generations.workspaceId, workspaceId), inArray(generations.status, ["pending", "running"])));
  if (running.length >= cap) {
    throw new AppError(CODES.GENERATION_CONCURRENT_CAP, `Plan limit: ${cap} concurrent generations.`, 429, { cap });
  }
}
```

- [ ] **Step 6 — Apply to API routes**

In `/api/generations` POST handler:

```ts
const userKey = `gen:user:${session.userId}`;
await rateLimit(adminDb, userKey, RATE_LIMITS_BY_PLAN[plan].userPerMinute, 60);
await assertGenerationCapacity(adminDb, session.workspaceId, plan);
```

(Same for `/api/uploads/inspiration` — one inspiration upload per minute per user, etc.)

- [ ] **Step 7 — Friendly translation map**

```ts
// apps/web/src/lib/errors/translate.ts
import { CODES } from "@layertone/shared";

export const FRIENDLY: Record<string, string> = {
  [CODES.BILLING_INSUFFICIENT_CREDITS]: "You don't have enough credits. Top up to continue.",
  [CODES.BILLING_WORKSPACE_READ_ONLY]: "Billing is paused. Please update your payment method.",
  [CODES.GENERATION_CONCURRENT_CAP]: "You have too many generations running. Wait or upgrade your plan.",
  [CODES.SAFETY_TEXT_BLOCKED]: "Your brief was blocked by content moderation.",
  [CODES.SAFETY_IMAGE_BLOCKED]: "The generated image was blocked by content moderation.",
  [CODES.RATE_LIMIT_EXCEEDED]: "Slow down — too many requests. Try again in a minute.",
  [CODES.VALIDATION_MOOD_ASPECT_MISMATCH]: "This mood doesn't support that output size. Pick another mood or change the output.",
  [CODES.VALIDATION_FILE_TOO_LARGE]: "File is too large (max 10 MB).",
  [CODES.VALIDATION_INVALID_IMAGE]: "That doesn't look like a supported image (PNG, JPG, WebP).",
};

export function friendly(code?: string): string {
  return (code && FRIENDLY[code]) ?? "Something went wrong. Please try again.";
}
```

- [ ] **Step 8 — Tests + commit**

```bash
pnpm test:unit
pnpm test:int   # rate-limit integration test against Postgres
git add -A
git commit -m "feat(hardening): rate limiting, concurrent-generation cap, AppError + friendly error map"
```

---

## Verification

```bash
pnpm test:int
```

## Commit message

```
feat(hardening): rate limiting, concurrent-generation cap, AppError + friendly error map
```
