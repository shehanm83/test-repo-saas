# Slice 44 — Admin shell + Mood Studio

**Phase:** 15 — Admin back-office
**Depends on:** 36, 16
**Spec references:** [Spec § 5 (Admin back-office)](../specs/2026-04-25-studio-v1-spec.md), [UI Prompt 11 — Admin Mood Studio](../specs/2026-04-25-studio-v1-ui-prompts.md).

**Definition of done:**
- `/admin/*` route group gated by `users.role='admin'`; non-admins redirected to /generate
- Audit log written on every admin action (`audit_log.is_admin_action=true`)
- Admin shell: top bar with badge "Admin", left rail with: Moods / Templates / Stock / Pricebook / Generations / Users / AUP
- Mood Studio: list + editor (per UI Prompt 11)
- Test render against synthetic brand button

---

## Files

**Create:**
- `apps/web/src/app/admin/layout.tsx`
- `apps/web/src/app/admin/moods/page.tsx`
- `apps/web/src/app/admin/moods/[id]/page.tsx`
- `apps/web/src/components/admin/{shell.tsx,mood-form.tsx,mood-test-render.tsx}`
- API routes: `/api/admin/moods` (GET, POST), `/api/admin/moods/[id]` (PATCH, DELETE), `/api/admin/moods/[id]/publish`, `/api/admin/moods/[id]/archive`, `/api/admin/moods/[id]/test-render` (POST)

---

## Tasks

- [ ] **Step 1 — Admin gate**

```tsx
// apps/web/src/app/admin/layout.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server";
import { AdminShell } from "@/components/admin/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getServerSession();
  if (s?.role !== "admin") redirect("/generate");
  return <AdminShell>{children}</AdminShell>;
}
```

- [ ] **Step 2 — Admin shell**

```tsx
// apps/web/src/components/admin/shell.tsx
import Link from "next/link";

const items = [
  { href: "/admin/moods", label: "Moods" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/pricebook", label: "Pricebook" },
  { href: "/admin/generations", label: "Generations" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/aup", label: "AUP" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r p-3">
        <div className="mb-4 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">ADMIN</div>
        <nav className="space-y-1">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="block rounded-md px-3 py-2 text-sm hover:bg-muted">{it.label}</Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3 — Mood list + editor pages**

(Per UI Prompt 11. The mood editor is a single form with sections A–H. Test-render button calls `/api/admin/moods/[id]/test-render` which:
 - constructs a synthetic brand (logo: small SVG, palette: 3 colors, fonts: Inter)
 - calls `GenerationApi.create` server-side with mood_id and synthetic brand
 - returns variant URLs (rendered with mock or real provider depending on AI_MODE)
)

- [ ] **Step 4 — API routes**

Each calls `MoodApi.adminCreate`, `adminUpdate`, etc. Each writes an `audit_log` entry on mutate (extract a helper `writeAdminAudit(actorUserId, action, payload)`).

- [ ] **Step 5 — Tests + commit**

```bash
pnpm --filter @vyora/web test
git add -A
git commit -m "feat(admin): admin shell + Mood Studio (CRUD + lifecycle + test-render)"
```

---

## Verification

```bash
pnpm dev   # set DEV_USER_ID to an admin-flagged user, navigate /admin/moods
```

## Commit message

```
feat(admin): admin shell + Mood Studio (CRUD + lifecycle + test-render)
```
