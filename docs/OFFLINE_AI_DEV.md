# Offline AI Development Profile

Use this profile when you want the full generation pipeline without OpenAI or any paid AI provider.

## What Runs

- Next web app creates real generation rows.
- Web API enqueues generation jobs to ElasticMQ.
- Worker consumes jobs.
- Worker uses mock AI providers.
- Worker writes background and rendered output images to MinIO.
- Results UI polls `/api/generations/:id` exactly like production.

No OpenAI API call is made when `AI_MODE=mock`.

## Required Env

`.env.local` should include:

```env
AI_MODE=mock
QUEUE_MODE=elasticmq
SQS_ENDPOINT=http://localhost:9324
SQS_QUEUE_GENERATIONS=http://localhost:9324/000000000000/studio-generations
STORAGE_MODE=minio
S3_ENDPOINT=http://localhost:9000
```

This repo's current `.env.local` is already configured this way.

## Run

Start Docker services first:

```bash
docker compose up -d
pnpm minio:bootstrap
pnpm queue:bootstrap
```

Then run the app and worker together:

```bash
pnpm dev:offline-ai
```

`pnpm dev:offline-ai` also runs the MinIO and ElasticMQ bootstraps before starting processes, so it is safe after Docker restarts.

The web app runs at `http://localhost:3000`. The worker logs should say:

```text
worker starting; queue: elasticmq ... | ai: mock
```

## Expected Flow

1. Open `/generate`.
2. Fill Quick Create.
3. Click `Generate images`.
4. Review the prompt dialog.
5. Click `Start generation`.
6. The result page opens.
7. Variants move through queued/running/completed using mock images.

If a generation gets stuck because the worker was not running, mark local pending/running rows failed or start the worker and retry.
