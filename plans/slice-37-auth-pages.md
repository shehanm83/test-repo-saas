# Slice 37 — Auth pages (Clerk-themed sign-up / sign-in)

**Phase:** 12 — Frontend onboarding
**Depends on:** 35, 10
**Spec references:** [UI Prompt 2 — Sign-up / sign-in](../specs/2026-04-25-studio-v1-ui-prompts.md).

**Definition of done:**
- `/sign-up` and `/sign-in` routes render Clerk's hosted components with Studio theming when `AUTH_MODE=clerk`
- When `AUTH_MODE=dev`, those routes auto-redirect into the app (already authenticated)
- Clerk webhook route at `/api/webhooks/clerk` mounted (uses `ClerkWebhookHandler` from slice 11)
- Middleware in `apps/web` bridges Clerk session → `app.current_workspace_id` setting on every request
- A clerk-mode visual smoke test (manual checkbox)

---

## Files

**Create:**
- `apps/web/src/app/sign-in/[[...rest]]/page.tsx`
- `apps/web/src/app/sign-up/[[...rest]]/page.tsx`
- `apps/web/src/app/api/webhooks/clerk/route.ts`
- `apps/web/src/middleware.ts`
- `apps/web/src/components/auth/clerk-card.tsx`

**Modify:**
- `apps/web/package.json` (`@clerk/nextjs`)

---

## Tasks

- [ ] **Step 1 — Add Clerk Next.js**

```bash
pnpm --filter @vyora/web add @clerk/nextjs
```

- [ ] **Step 2 — Middleware**

```ts
// apps/web/src/middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, req) => {
  // Pass-through; protection done at layout / API level
});

export const config = { matcher: ["/((?!_next|favicon.ico|api/webhooks).*)"] };
```

- [ ] **Step 3 — Sign-in / Sign-up pages**

```tsx
// apps/web/src/app/sign-in/[[...rest]]/page.tsx
import { SignIn } from "@clerk/nextjs";
import { loadConfig } from "@vyora/shared";
import { redirect } from "next/navigation";

export default function SignInPage() {
  const config = loadConfig();
  if (config.auth.mode === "dev") redirect("/generate");
  return (
    <main className="grid min-h-screen place-items-center bg-background">
      <div className="rounded-xl border p-8 shadow-sm">
        <SignIn appearance={{ elements: { card: "border-0 shadow-none" } }} />
      </div>
    </main>
  );
}
```

```tsx
// apps/web/src/app/sign-up/[[...rest]]/page.tsx
import { SignUp } from "@clerk/nextjs";
import { loadConfig } from "@vyora/shared";
import { redirect } from "next/navigation";

export default function SignUpPage() {
  const config = loadConfig();
  if (config.auth.mode === "dev") redirect("/onboarding/brand");
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="rounded-xl border p-8 shadow-sm">
        <SignUp />
      </div>
    </main>
  );
}
```

- [ ] **Step 4 — Webhook route**

```ts
// apps/web/src/app/api/webhooks/clerk/route.ts
import { ClerkWebhookHandler } from "@vyora/auth";
import { loadConfig } from "@vyora/shared";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const config = loadConfig();
  const body = await req.text();
  const handler = new ClerkWebhookHandler(config);
  const r = await handler.handle(body, req.headers);
  return NextResponse.json(r.body, { status: r.status });
}
```

- [ ] **Step 5 — Wrap app with `<ClerkProvider>` in root layout**

(Conditionally on `AUTH_MODE=clerk`):

```tsx
// apps/web/src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { loadConfig } from "@vyora/shared";

const config = loadConfig();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const inner = (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-foreground antialiased">{children}<Toaster /></body>
    </html>
  );
  return config.auth.mode === "clerk" ? <ClerkProvider>{inner}</ClerkProvider> : inner;
}
```

- [ ] **Step 6 — Commit**

```bash
pnpm --filter @vyora/web test
git add -A
git commit -m "feat(web): Clerk-themed sign-up/sign-in pages + webhook route + middleware"
```

---

## Verification

- With `AUTH_MODE=dev`, `/sign-in` redirects to app
- With `AUTH_MODE=clerk` (and Clerk test keys), Clerk components render

## Commit message

```
feat(web): Clerk-themed sign-up/sign-in pages + webhook route + middleware
```
