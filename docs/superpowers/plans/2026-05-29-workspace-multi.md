# Multi-Workspace: Admin List Fix + User Creation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin user list to show one row per user with workspaces underneath, and let users create additional workspaces (Free plan capped at 1, Subscription/PAYG unlimited).

**Architecture:** Two independent parts: (1) admin page — replace flat user×workspace join with two targeted queries merged server-side; (2) user creation — add `createWorkspace` DB query, `POST /api/workspaces` route, and a `CreateWorkspaceModal` client component wired into `WorkspaceSwitcher`.

**Tech Stack:** Next.js App Router server components, Drizzle ORM (PostgreSQL), React `"use client"` components, existing `.upgrade-overlay`/`.upgrade-dialog` CSS.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `packages/db/src/queries/workspace.ts` | Add `createWorkspace` export |
| Modify | `apps/web/app/api/workspaces/route.ts` | Add POST handler |
| Create | `apps/web/components/app/create-workspace-modal.tsx` | Modal form |
| Modify | `apps/web/components/app/workspace-switcher.tsx` | Wire modal open state |
| Modify | `apps/web/app/admin/users/page.tsx` | Two-query grouped render |

---

### Task 1: Add `createWorkspace` DB query

**Files:**
- Modify: `packages/db/src/queries/workspace.ts`

The `workspaces` table requires `ownerUserId` (NOT NULL). The `workspaceMembers` row must have `acceptedAt` set so the workspace shows up in `listWorkspacesForUser`.

- [ ] **Step 1: Add the function at the bottom of `workspace.ts`**

```ts
export async function createWorkspace(
  db: Db,
  args: { name: string; userId: string },
): Promise<{ id: string; name: string }> {
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ ownerUserId: args.userId, name: args.name })
      .returning({ id: workspaces.id, name: workspaces.name });
    await tx.insert(workspaceMembers).values({
      workspaceId: workspace!.id,
      userId: args.userId,
      role: "owner",
      acceptedAt: new Date(),
    });
    return workspace!;
  });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm --filter @layertone/db build
```

Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/queries/workspace.ts
git commit -m "feat(db): add createWorkspace query"
```

---

### Task 2: Add `POST /api/workspaces` route

**Files:**
- Modify: `apps/web/app/api/workspaces/route.ts`

The existing file only has a `GET` handler. Add a `POST` handler that:
1. Reads `session.workspaces` to count existing workspaces
2. Enforces Free plan cap of 1
3. Validates name (non-empty, ≤ 80 chars)
4. Calls `createWorkspace`
5. Returns `{ workspaceId }`

The `session.workspaces` field is `SessionWorkspace[]` — it already contains all workspaces the user belongs to (from `listWorkspacesForUser`).

- [ ] **Step 1: Replace the file contents with GET + POST**

```ts
import { NextResponse } from "next/server";

import { createDb } from "@layertone/db";
import { createWorkspace } from "@layertone/db";
import { loadConfig } from "@layertone/shared/config";

import { getServerSession } from "@/lib/auth/server";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(session.workspaces);
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Free plan: cap at 1 workspace
  const isFree = session.workspaces.every((w) => w.planCode === "free");
  if (isFree && session.workspaces.length >= 1) {
    return NextResponse.json({ error: "workspace-limit" }, { status: 400 });
  }

  const body = (await request.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "invalid-name" }, { status: 400 });
  }

  const db = createDb(loadConfig().db.url, "app_admin");
  const workspace = await createWorkspace(db, { name, userId: session.userId });

  return NextResponse.json({ workspaceId: workspace.id });
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @layertone/web typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/workspaces/route.ts
git commit -m "feat(api): add POST /api/workspaces for workspace creation"
```

---

### Task 3: Create `CreateWorkspaceModal` component

**Files:**
- Create: `apps/web/components/app/create-workspace-modal.tsx`

Uses the existing `.upgrade-overlay` / `.upgrade-dialog` CSS classes. On `workspace-limit` error, renders `<UpgradeModal>` instead of the form. After successful creation, calls `POST /api/workspaces/switch` then `router.refresh()` then `onClose()`.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { UpgradeModal } from "@/components/billing/upgrade-modal";

type State = "idle" | "submitting" | "limit-reached" | "error";

export function CreateWorkspaceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setState("idle");
      setName("");
      setErrorMsg("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  if (state === "limit-reached") {
    return (
      <UpgradeModal feature="generic" open onClose={onClose} />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setState("submitting");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = (await res.json()) as { workspaceId?: string; error?: string };
      if (!res.ok) {
        if (json.error === "workspace-limit") {
          setState("limit-reached");
          return;
        }
        setErrorMsg(json.error === "invalid-name" ? "Name must be 1–80 characters." : "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      // Switch to new workspace
      await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: json.workspaceId }),
      });
      router.refresh();
      onClose();
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  const busy = state === "submitting";

  return (
    <div className="upgrade-overlay" onClick={onClose}>
      <div
        className="upgrade-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ws-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="upgrade-dialog__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <h2 id="create-ws-title" className="upgrade-dialog__headline">
          New workspace
        </h2>
        <p className="upgrade-dialog__desc">
          Each workspace has its own brands, credits, and billing.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="ws-name">
              Workspace name
            </label>
            <input
              id="ws-name"
              className="input"
              type="text"
              autoFocus
              autoComplete="off"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My workspace"
              disabled={busy}
            />
          </div>
          {(state === "error") ? (
            <p className="upgrade-dialog__error">{errorMsg}</p>
          ) : null}
          <button
            type="submit"
            className="btn btn--accent upgrade-subscribe-btn"
            disabled={busy || !name.trim()}
          >
            {busy ? "Creating…" : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @layertone/web typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app/create-workspace-modal.tsx
git commit -m "feat(web): add CreateWorkspaceModal component"
```

---

### Task 4: Wire `WorkspaceSwitcher` to open the modal

**Files:**
- Modify: `apps/web/components/app/workspace-switcher.tsx`

The existing "Create new workspace" button has no `onClick`. Add `modalOpen` state and render `<CreateWorkspaceModal>` at component root.

- [ ] **Step 1: Add import and state**

At the top of `workspace-switcher.tsx`, add the import:

```tsx
import { CreateWorkspaceModal } from "./create-workspace-modal";
```

Inside the `WorkspaceSwitcher` function, add state after the existing `useState` calls:

```tsx
const [modalOpen, setModalOpen] = useState(false);
```

- [ ] **Step 2: Wire the button**

Find the existing "Create new workspace" button:

```tsx
          <button type="button" className="menu-item" style={{ width: "100%", textAlign: "left" }}>
            <I.Plus size={14} /> Create new workspace
          </button>
```

Replace with:

```tsx
          <button
            type="button"
            className="menu-item"
            style={{ width: "100%", textAlign: "left" }}
            onClick={() => { setOpen(false); setModalOpen(true); }}
          >
            <I.Plus size={14} /> Create new workspace
          </button>
```

- [ ] **Step 3: Add modal at component root**

At the end of the `WorkspaceSwitcher` return, just before the closing `</div>` of the outermost wrapper:

```tsx
      <CreateWorkspaceModal open={modalOpen} onClose={() => setModalOpen(false)} />
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @layertone/web typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/app/workspace-switcher.tsx
git commit -m "feat(web): wire CreateWorkspaceModal into WorkspaceSwitcher"
```

---

### Task 5: Restructure admin user list

**Files:**
- Modify: `apps/web/app/admin/users/page.tsx`

Replace the single flat join (one row per user×workspace) with two queries:
1. Paginated users with search/status filters
2. All workspace memberships for those user IDs

Merge server-side, render one row per user with indented workspace sub-rows.

The status filter currently filters on `workspaces.status`. After restructuring, status tab filters on any of the user's workspaces having that status.

- [ ] **Step 1: Replace the page file contents**

```tsx
import Link from "next/link";

import { createDb, users, workspaces, workspaceMembers } from "@layertone/db";
import { eq, sql, inArray } from "@layertone/db";
import { ilike, or, and } from "drizzle-orm";
import { loadConfig } from "@layertone/shared/config";

import { I } from "@/components/icons";
import {
  AdminEmpty,
  AdminPage,
  AdminSection,
  AdminStat,
  AdminStatGrid,
  AdminStatus,
  formatAdminDate,
  formatAdminNumber,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["key"];

function tabHref(tab: StatusTab, page = 0, q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (tab !== "all") params.set("status", tab);
  if (page > 0) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/users${qs ? `?${qs}` : ""}`;
}

const DOT_COLORS = ["#1D3B2A", "#5E5CE6", "#C97A3F", "#7A0E0E", "#1F7A5A", "#B5651D"];
function dotColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DOT_COLORS[h % DOT_COLORS.length]!;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageParam } = await searchParams;
  const db = createDb(loadConfig().db.url, "app_admin");

  const activeTab: StatusTab = STATUS_TABS.some((t) => t.key === status)
    ? (status as StatusTab)
    : "all";
  const page = Math.max(0, parseInt(pageParam ?? "0", 10) || 0);
  const trimmedQ = q?.trim() ?? "";

  // --- Query 1: users (with optional search) ---
  const userRows = await (trimmedQ
    ? db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(ilike(users.email, `%${trimmedQ}%`))
        .limit(PAGE_SIZE)
        .offset(page * PAGE_SIZE)
    : db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .limit(PAGE_SIZE)
        .offset(page * PAGE_SIZE));

  // Count query for pagination
  const [{ count: totalCount }] = await (trimmedQ
    ? db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(ilike(users.email, `%${trimmedQ}%`))
    : db.select({ count: sql<number>`count(*)::int` }).from(users)) as [{ count: number }];

  // --- Query 2: workspaces for these user IDs ---
  const userIds = userRows.map((u) => u.id);
  const wsRows = userIds.length > 0
    ? await db
        .select({
          userId: workspaceMembers.userId,
          workspaceId: workspaces.id,
          workspaceName: workspaces.name,
          workspaceStatus: workspaces.status,
          workspacePlan: workspaces.planCode,
          stripeCustomerId: workspaces.stripeCustomerId,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(inArray(workspaceMembers.userId, userIds))
    : [];

  // Group workspaces by userId
  const wsMap = new Map<string, typeof wsRows>();
  for (const row of wsRows) {
    if (!wsMap.has(row.userId)) wsMap.set(row.userId, []);
    wsMap.get(row.userId)!.push(row);
  }

  // Apply status tab filter (keep users that have at least one workspace with matching status)
  const filteredUsers = activeTab === "all"
    ? userRows
    : userRows.filter((u) => {
        const uws = wsMap.get(u.id) ?? [];
        return uws.some((w) => w.workspaceStatus === activeTab);
      });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  return (
    <AdminPage
      eyebrow={
        <>
          <I.User size={12} />
          Operations
        </>
      }
      title="Users & Workspaces"
      description="Search users by email, then inspect their workspaces, billing, and status."
    >
      <AdminStatGrid>
        <AdminStat
          label="Total users"
          value={formatAdminNumber(totalCount)}
          detail={trimmedQ ? "Search results" : `Page ${page + 1} of ${totalPages || 1}`}
          icon={<I.User size={14} />}
        />
        <AdminStat
          label="Workspaces"
          value={formatAdminNumber(wsRows.length)}
          detail="Across users on this page"
          icon={<I.Briefcase size={14} />}
        />
        <AdminStat
          label="Active"
          value={formatAdminNumber(wsRows.filter((w) => w.workspaceStatus === "active").length)}
          detail="Active workspaces on this page"
          icon={<I.Check size={14} />}
          tone="success"
        />
        <AdminStat
          label="Suspended"
          value={formatAdminNumber(wsRows.filter((w) => w.workspaceStatus === "suspended").length)}
          detail="Restricted workspaces on this page"
          icon={<I.Lock size={14} />}
          tone={wsRows.some((w) => w.workspaceStatus === "suspended") ? "danger" : "neutral"}
        />
      </AdminStatGrid>

      <form method="GET" style={{ marginBottom: 16, display: "flex", gap: 8, maxWidth: 540 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <I.Search
            size={14}
            style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }}
          />
          <input
            className="input"
            name="q"
            autoComplete="off"
            defaultValue={q ?? ""}
            placeholder="Search by email…"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button type="submit" className="btn btn--primary">Search</button>
        {trimmedQ ? (
          <Link href="/admin/users" className="btn btn--secondary">Clear</Link>
        ) : null}
      </form>

      {filteredUsers.length === 0 ? (
        <AdminEmpty icon={<I.Search size={28} />} title="No Results Found">
          Try a different email address.
        </AdminEmpty>
      ) : (
        <AdminSection title="Results" flush>
          {!trimmedQ ? (
            <div className="tabs" style={{ padding: "0 6px" }}>
              {STATUS_TABS.map((tab) => (
                <Link
                  key={tab.key}
                  href={tabHref(tab.key)}
                  className={`tab${activeTab === tab.key ? " is-active" : ""}`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="admin-list">
            {filteredUsers.map((user) => {
              const userWorkspaces = wsMap.get(user.id) ?? [];
              return (
                <div key={user.id} className="admin-list-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="admin-list-row__title">{user.email}</div>
                      <div className="admin-list-row__meta">
                        Role: {user.role} · Joined {formatAdminDate(user.createdAt)}
                      </div>
                    </div>
                    <span className="t-small" style={{ color: "var(--fg-4)" }}>
                      {userWorkspaces.length === 0
                        ? "No workspace"
                        : `${userWorkspaces.length} workspace${userWorkspaces.length > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  {userWorkspaces.length > 0 ? (
                    <div style={{ paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6, borderLeft: "2px solid var(--cal-gray-200)" }}>
                      {userWorkspaces.map((ws) => (
                        <div key={ws.workspaceId} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span
                            style={{ width: 8, height: 8, borderRadius: 100, background: dotColor(ws.workspaceId), flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{ws.workspaceName}</span>
                          <span className="pill">{ws.workspacePlan}</span>
                          <AdminStatus status={ws.workspaceStatus ?? "unknown"} />
                          {ws.stripeCustomerId ? (
                            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{ws.stripeCustomerId}</span>
                          ) : null}
                          <Link
                            href={`/admin/users/${ws.workspaceId}`}
                            className="btn btn--ghost btn--sm"
                            style={{ textDecoration: "none", fontSize: 12, marginLeft: "auto" }}
                          >
                            View <I.ChevronRight size={11} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {(hasPrev || hasNext) && (
            <div className="admin-pagination">
              <span className="admin-pagination__info">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} users
              </span>
              <div className="admin-pagination__nav">
                {hasPrev ? (
                  <Link href={tabHref(activeTab, page - 1, trimmedQ)} className="btn btn--secondary btn--sm">
                    <I.ChevronLeft size={13} /> Previous
                  </Link>
                ) : null}
                {hasNext ? (
                  <Link href={tabHref(activeTab, page + 1, trimmedQ)} className="btn btn--secondary btn--sm">
                    Next <I.ChevronRight size={13} />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </AdminSection>
      )}
    </AdminPage>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @layertone/web typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/users/page.tsx
git commit -m "fix(admin): group user list by user, show workspaces as sub-rows"
```

---

### Task 6: Final typecheck

- [ ] **Step 1: Build DB and API packages**

```bash
pnpm --filter @layertone/db build && pnpm --filter @layertone/api build
```

Expected: exits 0.

- [ ] **Step 2: Run web typecheck**

```bash
pnpm --filter @layertone/web typecheck
```

Expected: exits 0, no errors. If any errors, fix and commit before proceeding.
