# Slice 46 — Admin: Generation inspector + user/workspace tools + AUP enforcement

**Phase:** 15
**Depends on:** 44, 30
**Spec references:** [UI Prompt 12 — Generation inspector](../specs/2026-04-25-studio-v1-ui-prompts.md), [Spec § 5 (admin tools)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `/admin/generations`: search by ID; full detail view per UI Prompt 12 (summary, brief, prompts per variant, mosaic, ledger entries, operator actions)
- Operator actions: resume failed variants, override-and-rerun model, refund generation, flag for AUP review
- `/admin/users`: search by email / workspace slug / Stripe customer; workspace detail with ledger history + manual grant
- `/admin/aup`: list of flagged briefs / generations; suspend/ban workspace
- All actions write `audit_log`

---

## Files

**Create:**
- `apps/web/src/app/admin/generations/page.tsx`
- `apps/web/src/app/admin/generations/[id]/page.tsx`
- `apps/web/src/app/admin/users/page.tsx`
- `apps/web/src/app/admin/users/[id]/page.tsx`
- `apps/web/src/app/admin/aup/page.tsx`
- `apps/web/src/components/admin/{generation-inspector.tsx,operator-actions.tsx,workspace-detail.tsx}`
- API routes: `/api/admin/generations/[id]`, `/api/admin/generations/[id]/resume`, `/api/admin/generations/[id]/override-model`, `/api/admin/generations/[id]/refund`, `/api/admin/users*`, `/api/admin/aup/*`

---

## Tasks

- [ ] **Step 1 — Inspector page**

Server-fetches the generation with all variants + ledger entries via admin DB role, renders sections per UI Prompt 12.

- [ ] **Step 2 — Operator actions**

Each action is a POST to its endpoint:
- **Resume failed variants:** for each `status='failed'` variant, re-enqueue an SQS message; flip `status='queued'`.
- **Override model:** PATCH the variant's `templateId` reference to use a fallback model, re-enqueue.
- **Refund generation:** look up total committed credits; post an `adjustment` ledger entry equal to the sum, audit-logged. (NOT a Stripe refund — that's for top-up packs only.)
- **Flag for AUP review:** mark generation in an internal queue (insert into `audit_log` with `action='generation.aup_flagged'`).

- [ ] **Step 3 — User/workspace search + detail**

`/admin/users` SQL: ILIKE on `users.email`, JOIN through `workspace_members` and `workspaces` with `stripeCustomerId` ILIKE.

Workspace detail shows:
- Plan + status + quotas
- Ledger entries paginated
- Manual grant form (admin override → ledger entry kind='adjustment')
- Suspend / ban action (sets `workspaces.status='suspended'`)

- [ ] **Step 4 — AUP**

Admin sees a list of generations flagged via `audit_log.action='generation.aup_flagged'` plus any auto-flagged ones (heuristic block in slice 47). Per row: open generation inspector, suspend workspace.

- [ ] **Step 5 — Commit**

```bash
pnpm --filter @vyora/web test
git add -A
git commit -m "feat(admin): generation inspector + user/workspace tools + AUP enforcement"
```

---

## Verification

```bash
pnpm dev   # /admin/generations, /admin/users, /admin/aup all functional
```

## Commit message

```
feat(admin): generation inspector + user/workspace tools + AUP enforcement
```
