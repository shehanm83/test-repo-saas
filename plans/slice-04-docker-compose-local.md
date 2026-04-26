# Slice 04 — Docker Compose local stack

**Phase:** 0 — Foundation
**Depends on:** 02
**Spec references:** [Architecture § 6.2 (Docker Compose stack)](../specs/2026-04-25-studio-v1-architecture.md), [Spec § 10 (Local development env flags)](../specs/2026-04-25-studio-v1-spec.md).

**Definition of done:**
- `compose.yaml` boots Postgres+pgvector, MinIO, ElasticMQ, Mailpit
- `make dev:up`, `make dev:down`, `make dev:reset` work
- `.env.example` checked in; `.env.local` gitignored
- A README section explains the boot sequence

---

## Files

**Create:**
- `compose.yaml`
- `Makefile`
- `.env.example`
- `scripts/minio-bootstrap.sh`
- `README.md` (initial)

---

## Tasks

- [ ] **Step 1 — Create `compose.yaml`**

```yaml
name: studio-v1

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: studio
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: studio
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U studio -d studio"]
      interval: 5s
      timeout: 3s
      retries: 10

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio12345
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 3s
      retries: 10

  elasticmq:
    image: softwaremill/elasticmq-native:latest
    ports: ["9324:9324", "9325:9325"]

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  pgdata:
  miniodata:
```

- [ ] **Step 2 — Create `.env.example`**

```dotenv
# Auth
AUTH_MODE=dev
DEV_USER_ID=00000000-0000-0000-0000-000000000001
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# DB
DATABASE_URL=postgres://studio:dev@localhost:5432/studio

# Storage (MinIO compatible with AWS SDK)
STORAGE_MODE=minio
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minio12345
S3_BUCKET_APP=studio-app
S3_BUCKET_GLOBAL=studio-global
CLOUDFRONT_DOMAIN=

# Queue
QUEUE_MODE=elasticmq
SQS_ENDPOINT=http://localhost:9324
SQS_REGION=us-east-1
SQS_QUEUE_GENERATIONS=studio-generations
SQS_QUEUE_CAPTIONS=studio-captions
SQS_DLQ_GENERATIONS=studio-generations-dlq

# Billing
BILLING_MODE=stub
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_FREE=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=
STRIPE_PRICE_AGENCY=

# AI
AI_MODE=mock
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
REPLICATE_API_TOKEN=
RECRAFT_API_KEY=
BFL_API_KEY=
AWS_BEDROCK_REGION=us-east-1

# Email
EMAIL_MODE=mailpit
RESEND_API_KEY=
EMAIL_FROM=studio@example.com

# Observability
OBSERVABILITY=none
SENTRY_DSN=
SENTRY_ENVIRONMENT=local

# App
APP_URL=http://localhost:3000
```

- [ ] **Step 3 — Create `scripts/minio-bootstrap.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"
ACCESS_KEY="${S3_ACCESS_KEY_ID:-minio}"
SECRET_KEY="${S3_SECRET_ACCESS_KEY:-minio12345}"
APP_BUCKET="${S3_BUCKET_APP:-studio-app}"
GLOBAL_BUCKET="${S3_BUCKET_GLOBAL:-studio-global}"

# Wait for MinIO
until curl -fsS "$ENDPOINT/minio/health/live" >/dev/null; do sleep 1; done

# Use mc via docker if not installed
mc() {
  docker run --rm --network host \
    -e MC_HOST_local="http://${ACCESS_KEY}:${SECRET_KEY}@localhost:9000" \
    minio/mc:latest "$@"
}

mc mb -p "local/${APP_BUCKET}" || true
mc mb -p "local/${GLOBAL_BUCKET}" || true
mc anonymous set download "local/${GLOBAL_BUCKET}" || true

echo "MinIO buckets created: ${APP_BUCKET}, ${GLOBAL_BUCKET}"
```

```bash
chmod +x scripts/minio-bootstrap.sh
```

- [ ] **Step 4 — Create `Makefile`**

```makefile
.PHONY: dev dev\:up dev\:down dev\:reset minio\:bootstrap

dev: dev\:up minio\:bootstrap
	@echo "Local stack is up."
	@echo "  Postgres:   localhost:5432"
	@echo "  MinIO:      http://localhost:9001 (minio / minio12345)"
	@echo "  ElasticMQ:  http://localhost:9324"
	@echo "  Mailpit:    http://localhost:8025"

dev\:up:
	docker compose up -d

dev\:down:
	docker compose down

dev\:reset:
	docker compose down -v
	docker compose up -d

minio\:bootstrap:
	./scripts/minio-bootstrap.sh
```

- [ ] **Step 5 — Create `README.md`**

```markdown
# Studio v1

Generation-driven SaaS for finished, on-brand marketing images.

## Local development

Prerequisites: Node 20+, pnpm 9+, Docker.

```bash
cp .env.example .env.local
make dev        # boots Postgres + MinIO + ElasticMQ + Mailpit, creates buckets
pnpm install
pnpm dev        # wired in slice 35 onward
```

See `docs/superpowers/plans/INDEX.md` for the full implementation plan.
```

- [ ] **Step 6 — Boot the stack and verify**

```bash
make dev:up
docker compose ps
```
Expected: 4 services Up + healthy.

```bash
./scripts/minio-bootstrap.sh
```
Expected: "MinIO buckets created"

- [ ] **Step 7 — Verify each service**

```bash
psql "postgres://studio:dev@localhost:5432/studio" -c "SELECT 1"
curl -s http://localhost:9000/minio/health/live
curl -s http://localhost:9324
curl -s http://localhost:8025
```
Expected: each succeeds.

- [ ] **Step 8 — Tear down to verify reset works**

```bash
make dev:down
make dev:reset
```
Expected: services restart.

- [ ] **Step 9 — Commit**

```bash
git add -A
git commit -m "chore: add docker-compose local stack (postgres, minio, elasticmq, mailpit)"
```

---

## Verification

```bash
make dev:up
docker compose ps                # all healthy
psql "$DATABASE_URL" -c "SELECT 1"
curl -fsS http://localhost:9000/minio/health/live
```

## Commit message

```
chore: add docker-compose local stack (postgres, minio, elasticmq, mailpit)
```
