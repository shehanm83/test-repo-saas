# Staff (super-admin) authentication

Vyora's `/admin/*` and `/api/admin/*` surface uses **HTTP Basic auth** against
a dedicated `staff_users` table — fully decoupled from Clerk (the
customer-facing identity provider). This means:

- Clerk being down doesn't lock staff out of admin tooling.
- A leaked customer JWT can never escalate to admin, regardless of the
  `users.role` column on the customer side.
- The ops principal set and the customer principal set are separately
  audited.

The trade-off is that we own the password storage. Industry-standard
mitigations are in place: bcrypt at cost 12, constant-time-ish dummy-hash
comparison on unknown usernames, no public sign-up route. TOTP is reserved
in the schema (`staff_users.totp_secret`) but not yet enforced — see § 5.

## 1. Sign in

Browsers prompt natively when they receive a 401 with
`WWW-Authenticate: Basic`. Just visit `/admin/...` and enter the credentials
in the dialog.

For curl / programmatic access:

```bash
curl -u admin:<password> http://localhost:3000/admin/use-cases
```

The seed migration creates a single user:

| username | password |
|---|---|
| `admin`  | `ncCGXbwfpZ4Eq3wUiX88` |

**Rotate this immediately in any non-local environment** — see § 3.

## 2. Add another staff user

```bash
pnpm staff:add ops-bob
# prompts for password (must be ≥12 chars)
```

Or non-interactively (CI):

```bash
pnpm staff:add ops-bob 'a-strong-12-char-password'
```

Username pattern: `^[a-z][a-z0-9_-]{1,40}$`.

## 3. Rotate a password

The CLI is idempotent — running `pnpm staff:add` against an existing username
re-hashes and overwrites:

```bash
pnpm staff:add admin 'new-password-here'
# rotated password for staff user "admin" (<uuid>)
```

For production, set `DATABASE_URL` to the prod connection string and run the
same command from a host with credentials. There is no UI for rotation; this
is by design.

## 4. How the gating works

1. `apps/web/middleware.ts` matches `/admin/*` and `/api/admin/*` first
   (before any Clerk pass).
2. It reads the `Authorization` header, base64-decodes the Basic payload,
   and calls `verifyStaffBasicAuth(db, header)` from `@vyora/auth`.
3. On miss → 401 with `WWW-Authenticate: Basic realm="vyora-admin"`.
4. On hit → injects `x-staff-id` and `x-staff-username` into the downstream
   request headers and forwards.
5. `getServerSession()` (in `apps/web/lib/auth/server.ts`) reads those
   headers and synthesises an admin-role session — no `users` row required.

The middleware uses Node runtime (`runtime: "nodejs"` in its config) so
bcryptjs and the postgres-js driver work directly.

## 5. Future: TOTP / 2FA

`staff_users.totp_secret` is reserved. To turn it on:

1. CLI subcommand to provision a secret + show the QR (`otpauth` lib + `qrcode-terminal`).
2. Browsers don't natively prompt for TOTP, so the Basic flow becomes a
   tiny `/staff/sign-in` POST that takes username + password + code,
   issues an iron-session cookie, and replaces middleware's Basic check.
3. Same blast-radius properties; just adds 2FA.

Skip until needed (≥10 staff or external compliance asks).

## 6. Threat model & non-goals

In scope:
- Staff credential storage (bcrypt cost 12).
- Constant-time-ish credential comparison.
- Staff actions audited via the existing `writeAdminAudit` (already called
  by every `/api/admin/*` handler).

Out of scope:
- Brute-force rate limiting *specifically for staff*. The platform-wide
  rate limiter applies but doesn't single out the admin surface. If the
  admin surface is exposed publicly, add a per-IP throttle in the
  middleware before the bcrypt call.
- Customer-side users having admin access. They don't, ever. The
  `users.role = 'admin'` column on the customer table is now vestigial —
  the admin layout and middleware ignore it.

## 7. Migration to a hosted IdP later

If staff exceeds ~10 people or compliance asks for SSO, swap the `staff`
auth path:

- Replace `verifyStaffBasicAuth` with a Keycloak / Auth0 / Google Workspace
  token verifier.
- Keep the `x-staff-id`/`x-staff-username` injection contract; nothing else
  in the app changes.
- `staff_users` becomes a mirror of the IdP, populated on first login (same
  pattern as `bootstrapNewUser` for Clerk).

The rest of the app (`/admin/*` pages, `/api/admin/*` handlers, audit log)
keeps working with no edits.
