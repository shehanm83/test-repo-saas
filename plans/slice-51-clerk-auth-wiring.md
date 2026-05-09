# Slice 51 — Clerk Auth — End-to-End Wiring (Local + Production)

**Phase:** 18 — Auth hardening
**Depends on:** 10, 37
**Goal:** Make sign-up / sign-in fully functional with Clerk in both local dev and production.

The Clerk UI components, webhook route, `ClerkWebhookHandler`, and `ClerkProvider` already exist
from slices 10 and 37. This slice wires everything together: env vars, a middleware fix that
bridges Clerk's cookie session to the `verifyRequest()` adapter, and a local webhook tunnel so
`user.created` → `bootstrapNewUser()` runs on first sign-up.

---

## Root cause of current breakage

`getServerSession()` calls `adapters.auth.verifyRequest(headers)`, which reads
`Authorization: Bearer <token>`. The bare `clerkMiddleware()` validates the Clerk cookie but
never sets that header — so every server component sees `session = null`.

**Fix:** extend `clerkMiddleware` to call `auth.getToken()` and inject the result as the
`Authorization` header before the request reaches the Next.js app.

---

## Files

**Modify:**
- `apps/web/middleware.ts` — inject Bearer token from Clerk session
- `apps/web/.env.local` — populate Clerk keys, switch `AUTH_MODE=clerk`
- `.env.local` (root) — same

**No new files needed** — the sign-in/sign-up pages, webhook route, layout provider,
and `ClerkWebhookHandler` are already in place.

---

## Tasks

### Step 1 — Populate env vars (local)

In `apps/web/.env.local` **and** root `.env.local`, set:

```env
AUTH_MODE=clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# CLERK_WEBHOOK_SECRET= ← filled in Step 3
```

### Step 2 — Fix middleware

Replace `apps/web/middleware.ts` content:

```ts
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (process.env.AUTH_MODE !== "clerk") {
    return NextResponse.next();
  }

  const { clerkMiddleware } = await import("@clerk/nextjs/server");

  return clerkMiddleware(async (auth, req) => {
    const token = await auth.getToken();
    if (token) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("authorization", `Bearer ${token}`);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  })(request, event);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/webhooks).*)"],
};
```

### Step 3 — Local webhook tunnel

Clerk must be able to POST to `/api/webhooks/clerk`. Two options:

**Option A — ngrok (recommended):**
```bash
ngrok http 3000
# copy the https forwarding URL, e.g. https://abc123.ngrok-free.app
```

**Option B — Svix CLI:**
```bash
npm install -g svix-cli
svix listen --forward-to http://localhost:3000/api/webhooks/clerk
```

Then in the **Clerk Dashboard → Webhooks → Add Endpoint**:
- URL: `https://<tunnel>/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`
- Copy the **Signing Secret** (starts with `whsec_...`)

Add to both `.env.local` files:
```env
CLERK_WEBHOOK_SECRET=whsec_...
```

Restart the dev server after editing env.

### Step 4 — Clerk dashboard: allowed redirect URLs

In **Clerk Dashboard → Configure → Domains**:
- Add `http://localhost:3000` as an allowed origin / redirect URL

### Step 5 — Verify locally

1. `AUTH_MODE=clerk` in env → restart dev server
2. Visit `http://localhost:3000/sign-up` → Clerk sign-up form appears
3. Sign up with a test email → check DB: `SELECT * FROM users;` shows the new row
4. Check DB: `SELECT * FROM workspaces;` shows the bootstrapped workspace
5. After sign-up, app redirects to `/onboarding/brand/identify`
6. Visit a protected page → no redirect to sign-in (session works)
7. Sign out → redirected back to sign-in

---

## Production checklist

When deploying (slice 50):

1. **Create a Clerk Production instance** in the Clerk dashboard (separate from test)
2. Set production env vars:
   ```env
   AUTH_MODE=clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   CLERK_WEBHOOK_SECRET=whsec_...   # from production webhook endpoint
   ```
3. Add production webhook endpoint in Clerk dashboard:
   - URL: `https://yourdomain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
4. Add production domain to Clerk's allowed origins

---

## Commit message

```
feat(web): wire Clerk auth end-to-end — middleware Bearer injection + env
```
