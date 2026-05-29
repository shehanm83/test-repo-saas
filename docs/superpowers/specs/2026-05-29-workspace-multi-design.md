# Multi-Workspace: Admin List Fix + User Creation Flow

## Goal

Fix the admin user list to show one row per user (with workspaces listed underneath), and give users an actionable way to create a second workspace from the workspace switcher, gated by plan.

## Plan limits

| Plan | Workspace cap |
|---|---|
| free | 1 |
| subscription | unlimited |
| payg | unlimited |

## Part 1: Admin user list

### Current problem

The current query joins `users` × `workspaceMembers` × `workspaces`, producing one row per (user, workspace) pair. A user with 2 workspaces appears twice in the list.

### Fix

Replace the single flat join with two targeted queries:

1. **Users query** — fetch `users` with optional search/status filter, paginated
2. **Workspaces query** — for the users on the current page, fetch all their workspaces via `workspaceMembers`

Merge server-side into `Array<{ user, workspaces[] }>` before rendering.

### Rendering

One row per user:
- **Top line:** email, role badge, joined date
- **Sub-row per workspace:** coloured dot, workspace name, plan pill, status badge, "View →" link to `/admin/users/[workspaceId]`
- **No workspace:** dimmed "No workspace" note

Route stays `/admin/users` and `/admin/users/[workspaceId]` — detail page unchanged.

Search filters on user email OR any of the user's workspace names / Stripe customer IDs.

## Part 2: Workspace creation (user-facing)

### Entry point

`WorkspaceSwitcher` already renders a "Create new workspace" `<button>` with no `onClick`. Wire it to open a `CreateWorkspaceModal`.

### CreateWorkspaceModal

**File:** `apps/web/components/app/create-workspace-modal.tsx` (new, `"use client"`)

**Props:** `{ open: boolean; onClose: () => void }`

**States:**
- `idle` — shows name input + Create button
- `submitting` — spinner, buttons disabled
- `limit-reached` — swaps form for `<UpgradeModal feature="generic" open onClose={onClose} />`
- `error` — shows error message, form still accessible

**Submit flow:**
1. `POST /api/workspaces { name }` 
2. If `{ error: "workspace-limit" }` → switch to `limit-reached` state
3. If ok → `POST /api/workspaces/switch { workspaceId }` with the new workspace id → `router.refresh()` → `onClose()`

### API: `POST /api/workspaces`

**File:** `apps/web/app/api/workspaces/route.ts` (already exists as GET — add POST handler)

**Logic:**
1. `getSessionWorkspace()` — get `session.userId` and `session.workspaces`
2. Count user's current active workspaces from `session.workspaces`
3. If `planCode === "free"` and count ≥ 1 → return `{ error: "workspace-limit" }` 400
4. Validate name: non-empty string, max 80 chars
5. Call `createWorkspace(db, { name, userId })` 
6. Return `{ workspaceId: newWorkspace.id }`

### DB: `createWorkspace`

**File:** `packages/db/src/queries/workspace.ts` (add new export)

```ts
export async function createWorkspace(
  db: Db,
  args: { name: string; userId: string },
): Promise<{ id: string; name: string }> {
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ name: args.name, planCode: "free", status: "active" })
      .returning();
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

## Error handling

| Error | Response |
|---|---|
| Name empty or > 80 chars | 400 `{ error: "invalid-name" }` |
| Free plan, already has workspace | 400 `{ error: "workspace-limit" }` |
| DB failure | 500 `{ error: "internal" }` |

On the client, `workspace-limit` triggers `UpgradeModal`; all other errors show inline text below the form.

## What this does NOT include

- Workspace rename or delete
- Transferring credits between workspaces
- Inviting members at creation time
- Any change to the `/admin/users/[workspaceId]` detail page
