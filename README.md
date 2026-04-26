# Studio v1

Generation-driven SaaS for finished, on-brand marketing images.

## Workspace layout

- `apps/web`: Next.js app, keeping the current UI implementation and template-driven styling work.
- `apps/worker`: local worker entrypoint for generation processing.
- `packages/db`: Drizzle schema and database client.
- `packages/shared`: shared env parsing and common runtime utilities.
- `packages/gateway`: provider contracts and env-switched service stubs.
- `packages/renderer`: renderer placeholder for later slices.

## Local development

Prerequisites: Node 20+, pnpm, Docker.

```bash
cp .env.example .env.local
make dev
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`make dev` boots Postgres + MinIO + ElasticMQ + Mailpit and creates the required MinIO buckets.

## UI direction

The active web app lives in `apps/web` and continues to follow the design source in `template/`. The existing landing page and generation flow are preserved there so later slices can continue tightening toward pixel-perfect parity instead of rebuilding from scratch.
