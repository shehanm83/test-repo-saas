# Vyora Studio

Generation-driven SaaS for finished, on-brand marketing images.

This repo is a pnpm monorepo with a Next.js web app, a background worker, local Docker services, prompt templates, renderer templates, and AI provider adapters.

## What Is In This Repo

- `apps/web`: Next.js app, API routes, app shell, generate flow, brands, projects, billing, results UI.
- `apps/worker`: generation and caption workers.
- `packages/api`: application services for brands, products, projects, generation, captions, billing gates, and preflight.
- `packages/db`: Drizzle schema, queries, migrations, and seed scripts.
- `packages/gateway`: AI provider adapters for mock AI, OpenAI image, OpenAI text, Flux/Recraft routing.
- `packages/renderer`: Satori/Puppeteer render pipeline for final PNG outputs.
- `packages/shared`: config, output targets, commercial generation contract, preflight, executable prompt templates.
- `packages/storage`: MinIO/S3 key helpers and storage adapter code.
- `packages/queue`: SQS, ElasticMQ, and inline queue adapters.
- `docs`: local setup, offline AI, prompt template documentation.
- `plans`: implementation plans and product architecture notes.

## Prerequisites

- Node.js 20.11+.
- pnpm 10+.
- Docker Desktop, Rancher Desktop, or another Docker runtime.
- A shell that can reach the Docker daemon with `docker info`.

If you are on WSL and Docker Desktop is running but `docker info` fails, enable WSL integration in Docker Desktop for the current distro. A temporary workaround is to use `docker.exe compose ...`, but normal repo scripts expect `docker`.

## First Time Setup

```bash
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm minio:bootstrap
pnpm queue:bootstrap
set -a; source .env.local; set +a; pnpm db:migrate
pnpm db:seed
pnpm db:seed:pricebook
```

Local service URLs:

| Service | URL |
|---|---|
| Web app | `http://localhost:3000` |
| MinIO console | `http://localhost:9001` |
| ElasticMQ | `http://localhost:9324` |
| Mailpit | `http://localhost:8025` |
| Postgres | `postgres://studio:dev@localhost:5432/studio` |

Default local MinIO credentials are `minio` / `minio12345`.

## Environment Modes

The app is designed to run in three useful development profiles.

### Offline AI

Use this most of the time for UI, queue, worker, storage, result page, caption UI, and project workflow testing without spending AI credits.

```bash
docker compose up -d
pnpm dev:offline-ai
```

`pnpm dev:offline-ai` sets:

```env
QUEUE_MODE=elasticmq
AI_MODE=mock
```

It also runs MinIO and ElasticMQ bootstrap scripts before starting:

- `apps/web` at `http://localhost:3000`
- `apps/worker` consuming `studio-generations` and `studio-captions`
- mock image/text/moderation providers
- MinIO storage for generated PNGs

Worker logs should include:

```text
worker starting; queue: elasticmq ... | ai: mock
```

### Real OpenAI

Use this when testing the actual OpenAI image/text providers.

Add real values to `.env.local`:

```env
AI_MODE=real
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_TEXT_MODEL=gpt-5.4-mini
QUEUE_MODE=elasticmq
STORAGE_MODE=minio
S3_ENDPOINT=http://localhost:9000
SQS_ENDPOINT=http://localhost:9324
```

Then run:

```bash
docker compose up -d
set -a; source .env.local; set +a; pnpm dev:real-ai
```

Notes:

- `gpt-image-1` is the current practical local default.
- `gpt-image-2` may require OpenAI organization verification.
- Generated images are still stored in local MinIO unless you switch storage to real S3.
- Do not commit `.env.local`, API keys, or local credential scratch files.

### Split Web And Worker Terminals

When debugging either side independently:

```bash
docker compose up -d
pnpm minio:bootstrap
pnpm queue:bootstrap
set -a; source .env.local; set +a; pnpm db:migrate

pnpm --filter @vyora/web dev
pnpm --filter @vyora/worker dev
```

## Quick Create Generation Flow

1. Open `http://localhost:3000/generate`.
2. Choose `Quick Create`.
3. Select output platform and format.
4. Optionally select brand, logo assets, mood, campaign details, and product assets.
5. Add image direction.
6. Choose quality tier and number of samples.
7. Click generate.
8. Review the prompt preview dialog.
9. Confirm generation.
10. Results page polls `/api/generations/:id` until variants complete.

Quick Create supports:

- image-only generation
- campaign-only generation
- product-only generation
- product plus campaign generation
- selected brand colors/fonts
- selected brand logo overlay slots
- captions
- add/create project from generated content

Prompt templates live in:

```text
packages/shared/src/prompt-templates/
```

Template docs:

```text
docs/prompt-templates/authoring-guide.md
docs/prompt-templates/quick-create.md
```

## Output Targets

Output size and aspect ratio definitions live in:

```text
packages/shared/src/output-targets/index.ts
```

Examples:

- Facebook landscape post: `1080 x 566`, `1.91:1`
- Facebook link preview: `1200 x 630`, `1.91:1`
- Instagram/Facebook square: `1080 x 1080`, `1:1`
- Instagram/Facebook portrait: `1080 x 1350`, `4:5`
- Stories/Reels/TikTok: `1080 x 1920`, `9:16`

OpenAI supported request sizes are normalized inside:

```text
packages/gateway/src/providers/openai-image.ts
```

Final rendered image size is controlled by the selected output target and renderer template.

## Where Generated Images Are Stored

Local generated files are stored in MinIO bucket `studio-app`.

Typical keys:

```text
workspaces/<workspaceId>/generations/<generationId>/background-<variantId>.png
workspaces/<workspaceId>/generations/<generationId>/variants/<variantId>.png
```

- `background-<variantId>.png`: raw AI provider output.
- `variants/<variantId>.png`: final rendered output after template/layout/logo/text handling.

Open the MinIO console:

```text
http://localhost:9001
```

Login:

```text
minio / minio12345
```

## Captions

Caption generation is handled by the caption worker and caption API routes.

- Offline AI mode uses mock text output.
- Real AI mode uses the configured OpenAI text model.
- Caption cost is fixed in app logic.
- Caption cards are shown on the generation result page with copy actions.

## Brands

Brand creation and editing support:

- persisted tabbed brand setup
- 1 to 5 logo uploads
- brand colors
- fonts
- voice notes
- reference assets

Logo uploads should be selected locally first and persisted only when the user saves/finishes the brand setup.

## Projects

Generated content can be saved into projects. Projects are visible in the Projects area and retain generation/caption details for later review and download.

Relevant routes/components:

```text
apps/web/app/(app)/projects/
apps/web/app/api/projects/
apps/web/components/projects/
```

## Database

Run migrations:

```bash
set -a; source .env.local; set +a; pnpm db:migrate
```

Seed local data:

```bash
pnpm db:seed
pnpm db:seed:pricebook
```

Useful local inspection:

```bash
set -a; source .env.local; set +a
pnpm --filter @vyora/db exec tsx -e "import postgres from 'postgres'; (async()=>{ const sql=postgres(process.env.DATABASE_URL!,{max:1}); console.log(await sql\`select id,status,created_at from generations order by created_at desc limit 5\`); await sql.end(); })();"
```

## Testing And Verification

Focused checks used during generation work:

```bash
pnpm --filter @vyora/shared test -- --run router.test.ts
pnpm --filter @vyora/gateway test -- --run openai-image.test.ts
pnpm --filter @vyora/renderer test -- --run render.test.ts
pnpm --filter @vyora/worker typecheck
```

Broader checks:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

## Common Problems

### Docker Is Running But Scripts Cannot Reach It

Check:

```bash
docker info
```

If it fails in WSL, enable Docker Desktop WSL integration for the distro. Until then, `docker.exe compose -f compose.yaml up -d` can start containers, but repo scripts that call `docker` directly may still print socket errors.

### MinIO Uploads Or Downloads Fail

Run:

```bash
docker compose up -d
pnpm minio:bootstrap
```

Then confirm:

```bash
curl -fsS http://localhost:9000/minio/health/live
```

### Queue Handler Not Registered Or Jobs Not Running

Run:

```bash
pnpm queue:bootstrap
pnpm --filter @vyora/worker dev
```

Make sure `.env.local` has:

```env
QUEUE_MODE=elasticmq
SQS_ENDPOINT=http://localhost:9324
SQS_QUEUE_GENERATIONS=http://localhost:9324/000000000000/studio-generations
SQS_QUEUE_CAPTIONS=http://localhost:9324/000000000000/studio-captions
```

### Plan Limit Blocks New Generation

This usually means a generation row is still `pending` or `running`. Check recent rows:

```bash
set -a; source .env.local; set +a
pnpm --filter @vyora/db exec tsx -e "import postgres from 'postgres'; (async()=>{ const sql=postgres(process.env.DATABASE_URL!,{max:1}); console.log(await sql\`select id,status,created_at from generations order by created_at desc limit 10\`); await sql.end(); })();"
```

Start the worker and let it finish jobs. In local dev only, you can mark stuck rows failed after confirming the worker is not processing them.

### OpenAI Safety Rejection

The prompt builder adapts risky Quick Create prompts, including named character requests and generated text/banner text. If OpenAI still rejects a prompt, simplify the user direction and avoid:

- named copyrighted characters
- requests for readable text inside the image
- weapon-focused or violent phrasing
- logo recreation

### White Rendered Output But Raw Background Exists

Check MinIO:

- If `background-<variantId>.png` is correct but `variants/<variantId>.png` is white, the renderer/template is the issue.
- The Quick Create image-only template uses explicit `<img>` layers because Satori does not reliably render CSS background images.

## Git And Secrets

Do not commit:

- `.env.local`
- `openapi.txt`
- `docs/clerk.txt`
- `docs/strip.txt`
- API keys, webhook secrets, Stripe keys, Clerk secrets

Before pushing, run a staged secret scan:

```bash
git grep --cached -n -E "(sk_test_[A-Za-z0-9]+|sk_live_[A-Za-z0-9]+|pk_test_[A-Za-z0-9]+|pk_live_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|sk-proj-[A-Za-z0-9_-]+)" || true
```

`whsec_test` in tests is a fake literal and is safe.

## More Documentation

- `docs/LOCAL_DEV_SETUP.md`: detailed external service setup.
- `docs/OFFLINE_AI_DEV.md`: offline AI workflow.
- `docs/prompt-templates/`: prompt template authoring and Quick Create prompt paths.
