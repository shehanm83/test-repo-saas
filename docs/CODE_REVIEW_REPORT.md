# Code Review Report

**Date:** 2026-05-23  
**Scope:** All uncommitted working-tree changes (10 667 diff lines, full codebase)  
**Method:** 3-angle independent review (line-by-line scan · removed-behavior audit · cross-file tracer) → dedup → 1-vote verify  
**Status:** All findings fixed in this session ✅

---

## Findings — ranked by severity

### 1. 🔴 CRITICAL — `Ledger.refund()` drains credits instead of restoring them

| Field | Value |
|---|---|
| File | `packages/billing/src/ledger.ts:158` |
| Severity | Critical — money correctness |

**Bug:** `refund()` called `this.post({ amount: -Math.abs(args.amount) })`, which posts a **negative** ledger entry. Every Stripe `charge.refunded` webhook triggered a credit deduction instead of a credit restoration, making every refund event make the user's balance *worse*.

**Fix:** Changed to `Math.abs(args.amount)` (positive), consistent with `grant()`, `topup()`, and `release()`.

---

### 2. 🔴 CRITICAL — `GET /api/captions/[id]` had no authentication

| Field | Value |
|---|---|
| File | `apps/web/app/api/captions/[id]/route.ts:7` |
| Severity | Critical — information disclosure |

**Bug:** The GET handler queried the DB directly with no session check, no workspace ownership check. Any unauthenticated HTTP client that knew (or guessed) a caption job UUID could retrieve the full caption record including the generated text, brief, workspace ID, and credit cost.

**Fix:** Added `getServerSession()` check; returns 401 if unauthenticated. Added workspace ownership check; returns 403 if the session workspace doesn't match the caption job's workspace (admins are exempt).

---

### 3. 🔴 HIGH — CI Postgres health-check used wrong user, breaking all integration and e2e jobs

| Field | Value |
|---|---|
| File | `.github/workflows/ci.yaml:86, 118` |
| Severity | High — CI completely broken |

**Bug:** After renaming the Postgres user from `studio` to `layertone`, both CI jobs (`integration` and `e2e`) still had `--health-cmd "pg_isready -U studio"`. `pg_isready` returns a non-zero exit code when the role doesn't exist; the container never reached healthy state; every integration and e2e CI run timed out before a single test executed.

**Fix:** Changed both `--health-cmd` strings to `-U layertone`.

---

### 4. 🔴 HIGH — `DATABASE_URL` in CI pointed to non-existent database `studio`

| Field | Value |
|---|---|
| File | `.github/workflows/ci.yaml:91, 136` |
| Severity | High — CI completely broken |

**Bug:** `POSTGRES_DB: layertone` creates the database as `layertone`, but both CI `DATABASE_URL` env vars ended in `/studio`. All migration and test steps failed with `FATAL: database "studio" does not exist`.

**Fix:** Changed both to `postgres://layertone:dev@localhost:5432/layertone`.

---

### 5. 🟠 MEDIUM — Worker `resolveWorkerTarget()` could crash on null `outputTarget`

| Field | Value |
|---|---|
| File | `apps/worker/src/handler.ts:166` |
| Severity | Medium — worker crash, credits permanently reserved |

**Bug:** When both `outputTarget?.kind` and `primaryOutputTarget?.kind` were falsy, the fallback branch unconditionally accessed `outputTarget.aspectRatio`, `.width`, `.height` without checking whether `outputTarget` itself was null. Generation settings stored before the `kind` field existed, or any malformed/missing `output_target` JSON, would throw a `TypeError`, crash the worker job, and leave the generation's credits in the reserved state permanently (no release).

**Fix:** Added an `if (outputTarget)` guard around the spread. Added a safe final fallback (`1:1 / 1080×1080`) when both `outputTarget` and `primaryOutputTarget` are absent.

---

### 6. 🟠 MEDIUM — Archived mood status dot referenced undefined CSS variable `--studio-amber`

| Field | Value |
|---|---|
| File | `apps/web/components/admin/mood-studio.tsx:240` |
| Severity | Medium — silent UI regression |

**Bug:** The CSS variable `--studio-amber` was renamed to `--layertone-amber` in `cal-layertone.css`, but the else-branch in the mood status indicator (for archived/retired moods) still referenced `var(--studio-amber)`. Undefined CSS variables resolve to `transparent`, making the amber status dot invisible and indistinguishable from an unpublished draft.

**Fix:** Changed to `var(--layertone-amber)`.

---

### 7. 🟡 LOW — Admin refund idempotency key was fixed, silently swallowing legitimate second refunds

| Field | Value |
|---|---|
| File | `apps/web/app/api/admin/generations/[id]/refund/route.ts:44` |
| Severity | Low — UX hazard for admin |

**Bug:** The idempotency key was `admin-refund-gen-<id>` — fixed per generation. If an admin needed to issue a second manual credit adjustment for the same generation (e.g., first refund was partial, or a mistake was corrected), the ledger's `post()` method would find the existing entry and return `{ idempotent: true }`, crediting nothing, returning HTTP 200, and giving the admin no indication the operation was a no-op.

**Fix:** Appended `Date.now()` to the key: `admin-refund-gen-<id>-<timestamp>`. Each admin action now creates a distinct ledger entry. The admin audit log already records the full history, so over-refunding is detectable.

---

### 8. 🟡 LOW — Local dev setup docs and cheat-sheet referenced wrong database name `studio`

| Field | Value |
|---|---|
| File | `docs/LOCAL_DEV_SETUP.md:50, 360, 390` |
| Severity | Low — developer onboarding friction |

**Bug:** Three lines in the setup guide still showed `…/studio` as the database name in the connection string after the rename to `layertone`. New developers following the guide would get `database "studio" does not exist` when running `psql` or `db:migrate`.

**Fix:** Updated all three occurrences to use `/layertone`.

---

## Summary table

| # | File | Severity | Status |
|---|---|---|---|
| 1 | `packages/billing/src/ledger.ts:158` | 🔴 Critical | ✅ Fixed |
| 2 | `apps/web/app/api/captions/[id]/route.ts:7` | 🔴 Critical | ✅ Fixed |
| 3 | `.github/workflows/ci.yaml:86,118` | 🔴 High | ✅ Fixed |
| 4 | `.github/workflows/ci.yaml:91,136` | 🔴 High | ✅ Fixed |
| 5 | `apps/worker/src/handler.ts:166` | 🟠 Medium | ✅ Fixed |
| 6 | `apps/web/components/admin/mood-studio.tsx:240` | 🟠 Medium | ✅ Fixed |
| 7 | `apps/web/app/api/admin/generations/[id]/refund/route.ts:44` | 🟡 Low | ✅ Fixed |
| 8 | `docs/LOCAL_DEV_SETUP.md:50,360,390` | 🟡 Low | ✅ Fixed |

**All 8 findings resolved. Codebase is clear for continued development.**
