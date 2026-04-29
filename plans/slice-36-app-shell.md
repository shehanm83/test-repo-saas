# Slice 36 — App shell (top bar, sidebar, workspace switcher)

**Phase:** 11 — Frontend foundation
**Depends on:** 35, 12
**Spec references:** [UI Prompt 4 — App shell](../specs/2026-04-25-studio-v1-ui-prompts.md).

**Definition of done:**
- `(app)` route group with shared layout: top bar + left sidebar
- Top bar: wordmark, workspace switcher (dropdown), credit balance pill (server-fetched), avatar menu (account / billing / sign-out)
- Sidebar: Generate (primary), History, Brands, Projects, Stock library, Settings, Help, Plan badge
- Mobile: sidebar collapses to hamburger drawer
- API helper `getServerSession()` resolves identity from Clerk/dev adapter
- Component test for sidebar item rendering + active-state

---

## Files

**Create:**
- `apps/web/src/app/(app)/layout.tsx`
- `apps/web/src/app/(app)/loading.tsx`
- `apps/web/src/components/app/top-bar.tsx`
- `apps/web/src/components/app/workspace-switcher.tsx`
- `apps/web/src/components/app/credit-pill.tsx`
- `apps/web/src/components/app/sidebar.tsx`
- `apps/web/src/components/app/avatar-menu.tsx`
- `apps/web/src/lib/auth/server.ts` (server-side session helper)
- `apps/web/src/lib/api/client.ts` (typed fetch helper for client components)
- `apps/web/src/components/app/sidebar.test.tsx`

---

## Tasks

- [ ] **Step 1 — Server session helper**

```ts
// apps/web/src/lib/auth/server.ts
import { headers } from "next/headers";
import { loadConfig, createAdapters } from "@vyora/shared";

export async function getServerSession() {
  const config = loadConfig();
  const adapters = createAdapters(config);
  const h = await headers();
  const id = await adapters.auth.verifyRequest(new Headers(h as never));
  return id;
}

export async function requireSession() {
  const s = await getServerSession();
  if (!s) throw new Response("Unauthorized", { status: 401 });
  return s;
}
```

- [ ] **Step 2 — App layout**

```tsx
// apps/web/src/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { TopBar } from "@/components/app/top-bar";
import { Sidebar } from "@/components/app/sidebar";
import { getServerSession } from "@/lib/auth/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar session={session} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 — Top bar + workspace switcher + credit pill**

```tsx
// apps/web/src/components/app/top-bar.tsx
import Link from "next/link";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { CreditPill } from "./credit-pill";
import { AvatarMenu } from "./avatar-menu";
import type { AuthIdentity } from "@vyora/shared";

export function TopBar({ session }: { session: AuthIdentity }) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-lg font-semibold">Studio</Link>
        <WorkspaceSwitcher userId={session.userId} workspaceId={session.workspaceId ?? null} />
      </div>
      <div className="flex items-center gap-3">
        <CreditPill workspaceId={session.workspaceId} />
        <AvatarMenu userId={session.userId} />
      </div>
    </header>
  );
}
```

(`WorkspaceSwitcher` fetches `GET /api/workspaces` and renders a Select; on change calls `POST /api/workspaces/switch` and reloads.)
(`CreditPill` server component fetches the ledger balance through `Ledger.getBalance`.)

- [ ] **Step 4 — Sidebar**

```tsx
// apps/web/src/components/app/sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, History, Layers, FolderKanban, Image, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/generate", label: "Generate", icon: Sparkles, primary: true },
  { href: "/history", label: "History", icon: History },
  { href: "/brands", label: "Brands", icon: Layers },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/stock", label: "Stock library", icon: Image },
];

const bottom = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-60 flex-col border-r p-3 lg:flex">
      <nav className="flex-1 space-y-1">
        {items.map((it) => (
          <Link key={it.href} href={it.href}
            className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm",
              path === it.href ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
              it.primary && "font-medium",
            )}>
            <it.icon className="h-4 w-4" />{it.label}
          </Link>
        ))}
      </nav>
      <div className="mt-2 space-y-1 border-t pt-3">
        {bottom.map((it) => (
          <Link key={it.href} href={it.href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <it.icon className="h-4 w-4" />{it.label}
          </Link>
        ))}
        <Link href="/billing" className="block rounded-md bg-muted px-3 py-2 text-xs">
          Pro plan · Upgrade
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 5 — API routes (workspaces)**

```ts
// apps/web/src/app/api/workspaces/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { WorkspaceApi } from "@vyora/api";
import { loadConfig } from "@vyora/shared";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const api = new WorkspaceApi(loadConfig());
  return NextResponse.json(await api.list(session.userId));
}
```

```ts
// apps/web/src/app/api/workspaces/switch/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { loadConfig, createAdapters } from "@vyora/shared";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { workspaceId } = (await req.json()) as { workspaceId: string };
  const adapters = createAdapters(loadConfig());
  await adapters.auth.setActiveWorkspace(session.userId, workspaceId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6 — Component test**

```tsx
// apps/web/src/components/app/sidebar.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/generate" }));

import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("renders all primary items", () => {
    render(<Sidebar />);
    expect(screen.getByText("Generate")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7 — Commit**

```bash
pnpm --filter @vyora/web test
git add -A
git commit -m "feat(web): app shell with top bar, sidebar, workspace switcher, credit pill"
```

---

## Verification

```bash
pnpm --filter @vyora/web test
pnpm dev   # navigate to /generate, sidebar highlights it
```

## Commit message

```
feat(web): app shell with top bar, sidebar, workspace switcher, credit pill
```
