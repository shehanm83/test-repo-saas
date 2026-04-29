# Studio v1 — Local Dev Setup

End-to-end checklist to get every external integration working on your laptop. Each section says **(1) where to sign up**, **(2) what to enable / create**, **(3) the env vars**, and **(4) how to verify**. Skip the sections you don't need yet — every integration falls back to a stub or mock when its env vars are empty.

---

## 0. Prerequisites

- **Node** ≥ 20.11 (use `fnm` or `nvm`): `node -v`
- **pnpm** ≥ 10.16: `corepack enable && corepack prepare pnpm@latest --activate`
- **Docker / Rancher Desktop** running (`docker info` should succeed)
- **Stripe CLI** (only when wiring Stripe): https://docs.stripe.com/stripe-cli
- A web browser

---

## 1. First boot (no external services yet)

```bash
cd /home/shehan/personal/repo/test-repo-saas
cp .env.example .env.local        # if you don't have one yet
pnpm install
docker compose up -d              # postgres + minio + elasticmq + mailpit
./scripts/minio-bootstrap.sh      # creates studio-app + studio-global buckets
pnpm db:migrate
pnpm db:seed
pnpm db:seed:pricebook

# create the SQS queues (one-shot)
for q in studio-generations studio-captions studio-generations-dlq; do
  curl -s -X POST "http://localhost:9324/?Action=CreateQueue&QueueName=$q" >/dev/null
done

# in two terminals:
pnpm --filter @vyora/web dev          # http://localhost:3000
pnpm --filter @vyora/worker dev       # processes SQS messages
```

You'll have a working app at `http://localhost:3000` running entirely on local infra. Auth is bypassed (`AUTH_MODE=dev`), AI is mocked (`AI_MODE=mock`), billing is stubbed (`BILLING_MODE=stub`), email goes to Mailpit. Skip to the sections you want to wire up.

| Service | Console |
|---|---|
| App | http://localhost:3000 |
| MinIO | http://localhost:9001 (login `minio` / `minio12345`) |
| Mailpit | http://localhost:8025 |
| Postgres | `psql postgres://studio:dev@localhost:5432/studio` |

---

## 2. Auth — Clerk

Production-grade hosted auth. Free tier is more than enough for dev.

### Sign up
1. Go to **https://clerk.com** → **Sign up**.
2. Create an application. Choose **Email** + (optionally) Google/Apple as sign-in methods.
3. From the Clerk dashboard left nav: **API Keys** → copy:
   - **Publishable key** (starts with `pk_test_…`)
   - **Secret key** (starts with `sk_test_…`)

### Webhook (so new sign-ups get a workspace + 30 starter credits)
1. Clerk dashboard → **Webhooks** → **Add Endpoint**.
2. **Endpoint URL** for local dev: you need a public URL pointing at `http://localhost:3000/api/webhooks/clerk`. Use **ngrok** (or Clerk's built-in test mode) — `ngrok http 3000` gives you `https://abcd.ngrok.app`. Set the endpoint to `https://abcd.ngrok.app/api/webhooks/clerk`.
3. **Subscribe to events**: `user.created`, `user.deleted`.
4. Copy the **Signing Secret** (starts with `whsec_…`).

### Env vars
Edit `.env.local`:
```env
AUTH_MODE=clerk
CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
CLERK_WEBHOOK_SECRET=whsec_…
```
Restart `pnpm --filter @vyora/web dev` (env changes don't hot-reload).

### Verify
1. Open an incognito window → http://localhost:3000 → click **Start free**
2. Real Clerk sign-up UI appears (instead of redirecting to onboarding)
3. Sign up with an email → check Clerk dashboard → user is there
4. Webhook fires → check Postgres: `select id, email, role from users;` — your new user should be there
5. `select id, name, plan_code from workspaces;` — a personal workspace was created
6. `select sum(amount) from credit_ledger_entries where workspace_id = '<your-workspace-id>';` — should be 30 (the starter grant)

### Switch back to dev mode
Set `AUTH_MODE=dev` and restart. The dev provider auto-resolves `DEV_USER_ID`.

---

## 3. Billing — Stripe (test mode)

### Sign up
1. **https://stripe.com** → sign up. Stay in **Test Mode** (toggle top-right of the dashboard).
2. **Developers** → **API keys** → copy:
   - **Secret key** (`sk_test_…`)
   - (Publishable key isn't used by this app — server-only flow.)

### Create products + prices
You need **5 subscription prices** + **3 one-shot top-up prices**. Stripe Dashboard → **Products** → **Add product**:

| Plan | Price (monthly recurring) | Notes |
|---|---|---|
| Studio Free | $0/mo | Required so webhook can map free downgrades |
| Studio Starter | $19/mo | |
| Studio Pro | $49/mo | |
| Studio Business | $129/mo | |
| Studio Agency | $299/mo | |

Top-ups (**one-time** payments, not recurring):

| Pack | Price | Credits |
|---|---|---|
| Studio 200 credits | $9 | 200 |
| Studio 750 credits | $29 | 750 |
| Studio 2,500 credits | $79 | 2,500 |

After creating each product, copy its **price ID** (looks like `price_1abc…`).

### Webhook
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe` (macOS) or download from https://docs.stripe.com/stripe-cli
2. `stripe login`
3. In a dedicated terminal: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. The CLI prints a `whsec_…` value — that's your **webhook signing secret** for local dev (different from the dashboard webhook secret).

The webhook handler covers: `invoice.paid` (subscription credits grant), `customer.subscription.created/updated/deleted` (plan changes + dunning → `workspace.status='read_only'`), `checkout.session.completed` (top-up credit grant), `charge.refunded` (paired refund ledger entry).

### Env vars
```env
BILLING_MODE=stripe-test
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…   # from `stripe listen`
STRIPE_PRICE_FREE=price_…
STRIPE_PRICE_STARTER=price_…
STRIPE_PRICE_PRO=price_…
STRIPE_PRICE_BUSINESS=price_…
STRIPE_PRICE_AGENCY=price_…
STRIPE_PRICE_TOPUP_200=price_…
STRIPE_PRICE_TOPUP_750=price_…
STRIPE_PRICE_TOPUP_2500=price_…
```
Restart web.

### Verify
1. Visit `/billing` → click **Buy** on a top-up pack → real Stripe Checkout opens
2. Use test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP
3. Complete payment → Stripe sends `checkout.session.completed` to your webhook
4. Webhook calls `Ledger.topup({...})` → credits land in your workspace
5. Refresh `/billing` → balance went up by the pack's credits
6. `/api/billing/invoices` → returns paid invoices (after the first paid charge)
7. Visit Stripe Customer Portal: `/api/billing/portal` returns a URL — click it to manage subscription / payment method

For the subscription flow (plan changes), use Stripe's hosted Checkout (currently the app uses top-up checkouts; subscription-checkout endpoint exists but isn't surfaced in the UI yet).

---

## 4. AI providers

The app routes generation requests through `packages/gateway`. Each provider can be configured independently — the gateway picks the right one per `modelCode` and falls back to Bedrock SD 3.5 on failure (per spec § 4).

### `AI_MODE`
| Value | Behavior |
|---|---|
| `mock` | Returns deterministic placeholder PNGs keyed by prompt hash. **Default in dev.** |
| `record` | Calls real APIs and writes responses to `apps/web/tests/__fixtures__/ai/`. Useful for building integration test snapshots. |
| `real` | Calls real APIs only. |

Set `AI_MODE=real` once any provider key is present.

### 4a. OpenAI (text moderation, embeddings, gpt-image-1, vision)

1. **https://platform.openai.com** → sign up
2. **API Keys** → **Create new secret key** → copy `sk-…`
3. **Important:** add a payment method and at least $5 of credits. The free trial is gone.

```env
AI_MODE=real
OPENAI_API_KEY=sk-…
```

**Verify:**
```bash
curl -X POST http://localhost:3000/api/generations \
  -H 'content-type: application/json' \
  -d '{
    "brandId":"<from /api/brands>",
    "brief":"Christmas sale 30% off, cozy living room",
    "outputTarget":{"kind":"social","platform":"ig","format":"ig-post"},
    "flags":{"usePremiumModel":true}
  }'
```
With `usePremiumModel: true`, the gateway picks `gpt-image-1`.

### 4b. Anthropic Claude (caption generation + vision-fallback for inspiration→description)

1. **https://console.anthropic.com** → sign up
2. **API Keys** → **Create Key** → copy `sk-ant-…`
3. Top up credits ($5+ recommended).

```env
ANTHROPIC_API_KEY=sk-ant-…
```

**Verify:** create a generation, click **Add caption** on the results page → real Claude Haiku 4.5 caption appears.

### 4c. Replicate (Flux 1.1 Pro — default image model)

1. **https://replicate.com** → sign up with GitHub
2. **Account** → **API Tokens** → **Create token** → copy `r8_…`
3. Add a payment method (Replicate charges per second of GPU time, ~$0.04 per Flux image).

```env
REPLICATE_API_TOKEN=r8_…
```

**Verify:** run a default generation (no premium toggle). The variant uses `flux-1.1-pro` via Replicate.

### 4d. Recraft V3 (design-y / typographic image model — promoted automatically when brief mentions logos / typography)

1. **https://www.recraft.ai** → sign up
2. **Profile** → **API** → **Create API key** → copy
3. Add credits.

```env
RECRAFT_API_KEY=…
```

**Verify:** generate with brief like *"clean editorial typographic poster"* — gateway routing promotes to Recraft V3.

### 4e. Black Forest Labs (Flux direct API — alternative to Replicate)

Optional. The default Flux path uses Replicate. BFL is a fallback / upgrade if you want lower latency direct from BFL.

1. **https://api.bfl.ml** → sign up
2. Generate API key → `BFL_API_KEY=…`

```env
BFL_API_KEY=…
```

### 4f. AWS Bedrock (Stable Diffusion 3.5 + Nova Canvas — *fallback* models, post-flight safety classifier)

Bedrock is the spec's mandated fallback when Flux fails twice in a row. Also runs the post-flight image-NSFW classifier.

1. **AWS Console** → sign up (free tier doesn't cover Bedrock; budget ~$5/mo)
2. **Bedrock console** → **Model access** → **Manage model access** → enable:
   - **Stability AI · Stable Diffusion 3.5 Large**
   - **Amazon · Nova Canvas**
   - **Amazon · Titan Image Generator** (used by Nova route)
3. **IAM** → create user `studio-bedrock-dev` with policy `AmazonBedrockFullAccess` (dev-only; prod should be scoped)
4. Generate access keys → copy

```env
AWS_BEDROCK_REGION=us-east-1
# Bedrock SDK reads the standard AWS credential env vars:
AWS_ACCESS_KEY_ID=AKIA…
AWS_SECRET_ACCESS_KEY=…
```

(These same `AWS_*` vars are already in your `.env.local` set to `minio` / `minio12345` so MinIO works. Once you wire real AWS, those local MinIO values stop working — instead, switch MinIO to its own creds: pass `accessKeyId` + `secretAccessKey` directly in `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` (the storage adapter uses these explicitly), and only put the AWS account creds in `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.)

**Verify:** force a Flux failure (set an invalid `REPLICATE_API_TOKEN`) → worker logs show fallback to `bedrock-sd35` and image still renders.

---

## 5. Email — Resend (production) / Mailpit (dev, default)

### Dev: Mailpit (no signup)
Already configured. `EMAIL_MODE=mailpit` routes outbound mail to the local Mailpit container. View at **http://localhost:8025**.

### Prod: Resend
1. **https://resend.com** → sign up (free tier: 100 emails/day, plenty for dev)
2. **API Keys** → **Create API Key** → `re_…`
3. **Domains** → add and verify your sender domain (or use the included `onboarding@resend.dev` for testing)

```env
EMAIL_MODE=resend
RESEND_API_KEY=re_…
EMAIL_FROM=studio@your-verified-domain.com
```

**Verify:** trigger any flow that sends email (workspace invite, dunning notice). The `EMAIL_MODE=resend` adapter is wired but the in-app triggers aren't all surfaced yet — the cleanest test is to call `adapters.email.send({...})` directly.

---

## 6. Observability — Sentry (optional)

Optional but recommended once you start sharing the app. Free tier: 5k events/month.

1. **https://sentry.io** → sign up
2. **Create Project** → choose **Next.js**
3. Copy the **DSN** (looks like `https://abc@o123.ingest.sentry.io/456`)

```env
OBSERVABILITY=sentry
SENTRY_DSN=https://abc@o123.ingest.sentry.io/456
SENTRY_ENVIRONMENT=local
```

**Verify:** trigger an error (e.g., POST malformed JSON to `/api/generations`) → check Sentry dashboard → exception captured with workspaceId, generationId tags.

CloudWatch metrics emit (`variant.duration_ms`, `provider.latency_ms`, etc.) only fire when AWS creds are valid. They no-op silently otherwise.

---

## 7. Storage — MinIO (default) → AWS S3 (production)

Dev uses MinIO. To switch to real S3:

1. Create two buckets in the AWS console: `studio-app-prod-assets` and `studio-app-prod-global`
2. (Optional) Set up CloudFront in front of `studio-app-prod-assets`. The signing logic in `packages/storage/src/s3.ts` supports CloudFront signed URLs — set `CLOUDFRONT_DOMAIN`.
3. IAM user with `AmazonS3FullAccess` (or scoped to those buckets)

```env
STORAGE_MODE=s3
S3_ENDPOINT=                               # leave blank — defaults to AWS
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIA…
S3_SECRET_ACCESS_KEY=…
S3_BUCKET_APP=studio-app-prod-assets
S3_BUCKET_GLOBAL=studio-app-prod-global
CLOUDFRONT_DOMAIN=cdn.your-domain.com      # optional
```

---

## 8. Queue — ElasticMQ (default) → AWS SQS (production)

Dev uses ElasticMQ. To switch to real SQS:

1. Create three FIFO queues in AWS:
   - `studio-prod-generations`
   - `studio-prod-captions`
   - `studio-prod-generations-dlq` (DLQ)
2. Set the main queue's redrive policy to send to DLQ after 3 receives.

```env
QUEUE_MODE=sqs
SQS_ENDPOINT=                              # leave blank — defaults to AWS
SQS_REGION=us-east-1
SQS_QUEUE_GENERATIONS=https://sqs.us-east-1.amazonaws.com/<acct>/studio-prod-generations
SQS_QUEUE_CAPTIONS=https://sqs.us-east-1.amazonaws.com/<acct>/studio-prod-captions
SQS_DLQ_GENERATIONS=https://sqs.us-east-1.amazonaws.com/<acct>/studio-prod-generations-dlq
```

---

## 9. Database — Postgres + pgvector

Dev uses local Docker. For prod, use **Neon** (recommended — has pgvector enabled by default):

1. **https://neon.tech** → sign up → create project
2. **SQL Editor** → run: `CREATE EXTENSION IF NOT EXISTS pgvector;`
3. Copy the connection string

```env
DATABASE_URL=postgres://user:pass@ep-xxx.aws.neon.tech/studio?sslmode=require
```

Then run migrations against it: `DATABASE_URL=… pnpm db:migrate`

---

## 10. Full-stack smoke test (after all services are wired)

```bash
# 1. Sign up via Clerk → land in onboarding
# 2. Complete onboarding wizard → land at /generate
# 3. Submit a generation with usePremiumModel=true → routes to gpt-image-1
# 4. Watch the worker process the SQS message → 4 variants render
# 5. On results page: click "Add caption" → Claude Haiku writes a caption
# 6. Visit /billing → click Buy on the 750-credit pack → Stripe Checkout
# 7. Pay with 4242 4242 4242 4242 → webhook credits the ledger
# 8. /admin/generations/<id> as admin role → inspector shows full data
```

If every step works, you have a fully production-equivalent stack running locally.

---

## Cheat sheet — quick env templates

### `.env.local` (mocks everything — already what `.env.example` provides)
```env
AUTH_MODE=dev
DEV_USER_ID=00000000-0000-0000-0000-000000000001
DATABASE_URL=postgres://studio:dev@localhost:5432/studio
STORAGE_MODE=minio
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minio12345
S3_BUCKET_APP=studio-app
S3_BUCKET_GLOBAL=studio-global
S3_REGION=us-east-1
QUEUE_MODE=elasticmq
SQS_ENDPOINT=http://localhost:9324
SQS_REGION=us-east-1
SQS_QUEUE_GENERATIONS=http://localhost:9324/000000000000/studio-generations
SQS_QUEUE_CAPTIONS=http://localhost:9324/000000000000/studio-captions
SQS_DLQ_GENERATIONS=http://localhost:9324/000000000000/studio-generations-dlq
AWS_ACCESS_KEY_ID=minio
AWS_SECRET_ACCESS_KEY=minio12345
BILLING_MODE=stub
AI_MODE=mock
EMAIL_MODE=mailpit
EMAIL_FROM=studio@example.com
OBSERVABILITY=none
APP_ENV=local
APP_URL=http://localhost:3000
```

### `.env.local` (everything wired live)
Add these on top of the dev block, flip the modes:
```env
AUTH_MODE=clerk
CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
CLERK_WEBHOOK_SECRET=whsec_…

BILLING_MODE=stripe-test
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_FREE=price_…
STRIPE_PRICE_STARTER=price_…
STRIPE_PRICE_PRO=price_…
STRIPE_PRICE_BUSINESS=price_…
STRIPE_PRICE_AGENCY=price_…
STRIPE_PRICE_TOPUP_200=price_…
STRIPE_PRICE_TOPUP_750=price_…
STRIPE_PRICE_TOPUP_2500=price_…

AI_MODE=real
OPENAI_API_KEY=sk-…
ANTHROPIC_API_KEY=sk-ant-…
REPLICATE_API_TOKEN=r8_…
RECRAFT_API_KEY=…
BFL_API_KEY=…                   # optional
AWS_BEDROCK_REGION=us-east-1

EMAIL_MODE=resend
RESEND_API_KEY=re_…
EMAIL_FROM=studio@your-domain.com

OBSERVABILITY=sentry
SENTRY_DSN=https://…
SENTRY_ENVIRONMENT=local
```

---

## Costs (rough, dev usage)

| Service | Free tier covers dev? | Estimated dev cost / month |
|---|---|---|
| Clerk | ✅ 10k MAUs free | $0 |
| Stripe | ✅ test mode = free forever | $0 |
| OpenAI | ❌ $5 minimum | $5 |
| Anthropic | ❌ $5 minimum | $5 |
| Replicate | ✅ Some free credits | $0–10 |
| Recraft | ✅ 50 free / month | $0 |
| AWS Bedrock | ❌ pay-per-token | $1–5 |
| Resend | ✅ 100 mail/day | $0 |
| Sentry | ✅ 5k events / month | $0 |
| Neon Postgres | ✅ free tier | $0 |
| **Total** | | **~$15-25/mo** |

---

## Troubleshooting

**"My env changes aren't picked up"** — restart `pnpm --filter @vyora/web dev` and `pnpm --filter @vyora/worker dev`. Next.js caches env at boot.

**"Connection slots reserved"** Postgres error — the dev server leaked pool connections. Run:
```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
 WHERE application_name LIKE 'studio-%' AND pid <> pg_backend_pid();
```

**Webhook "signature verification failed"** — make sure the `STRIPE_WEBHOOK_SECRET` env matches the *current* `stripe listen` session's secret. The CLI generates a new secret each time you run it.

**Clerk webhook never fires** — Clerk only delivers to public HTTPS URLs. Use ngrok and update the webhook endpoint to the ngrok URL each time you start a new tunnel.

**MinIO `Access Denied`** — the bootstrap script must run after MinIO is healthy. Re-run `./scripts/minio-bootstrap.sh`.

**`/admin/*` redirects to `/generate`** — your seeded user is admin. If you sign up fresh via Clerk, your role defaults to `user`. Manually flip with:
```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

**SQS queues missing** — re-run the queue creation loop in section 1.

---

## What's NOT yet wired (heads-up)

- **Subscription plan changes from the UI** — `/billing` doesn't yet have the "Upgrade to Pro" buttons that hit `createSubscriptionCheckout`. The endpoint exists; the UI is stubbed.
- **Workspace invite emails** — invite-member API works server-side, but the frontend invite form is on the settings page (Coming soon).
- **Real reference image upload in onboarding** — the wizard's References step has the dropzone UI but doesn't yet POST to `/api/brands/[id]/assets` (uploaded files are stored to sessionStorage and discarded). Easy to wire when ready.
- **OpenTelemetry collector** — Sentry covers errors + spans. CloudWatch covers metrics. OTEL is a hook (`tagSpan`) sprinkled at seams; turn it on later when you adopt Honeycomb/Grafana.

These are noted in `plans/INDEX.md` slices that haven't been implemented end-to-end yet — none block the core image-generation flow.
