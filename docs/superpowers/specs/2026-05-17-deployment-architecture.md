# Deployment Architecture

Layertone deployment plan. Two environments described: **local development** and **AWS cloud (target)**.

---

## 1. Local Development

Runs on Docker Compose (`compose.yaml`) plus two pnpm dev processes.

```mermaid
graph TB
    subgraph Developer Machine
        subgraph "Docker Compose"
            PG[(PostgreSQL\npgvector:pg16\n:5432)]
            MINIO[(MinIO\nS3-compatible storage\n:9000 / :9001)]
            EMQ[ElasticMQ\nSQS-compatible\n:9324]
            MAIL[Mailpit\nSMTP trap\n:8025]
        end

        subgraph "pnpm dev processes"
            WEB["apps/web\nNext.js\n:3000"]
            WORKER["apps/worker\nNode.js SQS consumer\n(long-poll loop)"]
        end

        BROWSER[Browser]
    end

    BROWSER -->|HTTP| WEB
    WEB -->|Drizzle ORM| PG
    WEB -->|SQS SendMessage| EMQ
    WEB -->|S3 presign/read| MINIO
    WORKER -->|SQS ReceiveMessage| EMQ
    WORKER -->|Drizzle ORM| PG
    WORKER -->|S3 write| MINIO
    WORKER -->|Mock AI providers| WORKER
```

### Local mode flags

| `AI_MODE` | `QUEUE_MODE` | Use case |
|-----------|-------------|----------|
| `mock` | `elasticmq` | UI, flow, storage testing (no API cost) |
| `real` | `elasticmq` | Real OpenAI/Replicate, local infra |
| `mock` | `inline` | Unit/integration tests (in-process) |

---

## 2. AWS Cloud Target (CDK)

Four independent CDK stacks in `infra/`. Fully serverless — no long-running EC2 or containers.

```mermaid
graph TB
    USER[End User]

    subgraph "AWS (us-east-1)"
        subgraph "LayertoneStaging/Prod Web Stack"
            CF["CloudFront\nDistribution"]
            WEBFN["Lambda: layertone-{stage}-web\nNode.js 20 / 1024 MB / 30s\nOpenNext wrapper"]
            SSM["SSM Parameter Store\n/layertone/{stage}/*\n(Stripe, Clerk, OpenAI, etc.)"]
        end

        subgraph "LayertoneStaging/Prod Worker Stack"
            WORKERFN["Lambda: layertone-{stage}-worker\nNode.js 20 / 1536 MB / 120s\nSQS event source"]
        end

        subgraph "LayertoneStaging/Prod Queues Stack"
            GENQ["SQS: layertone-{stage}-generations\nvisibility: 180s / maxReceive: 3"]
            CAPQ["SQS: layertone-{stage}-captions\nvisibility: 60s / maxReceive: 3"]
            DLQ["SQS DLQ\nretention: 14 days"]
        end

        subgraph "LayertoneStaging/Prod Storage Stack"
            S3APP["S3: layertone-app-{stage}-assets\nversioned / encrypted\nlifecycle rules"]
            S3GLOB["S3: layertone-app-{stage}-global\nversioned / encrypted"]
        end

        subgraph "External AWS"
            CW["CloudWatch\nMetrics"]
            BED["Bedrock\n(optional AI models)"]
        end
    end

    subgraph "External SaaS"
        CLERK["Clerk\nAuthentication"]
        STRIPE["Stripe\nBilling"]
        OAI["OpenAI\nImage + Text"]
        REP["Replicate / Recraft\nImage generation"]
        SENTRY["Sentry\nError monitoring"]
        NEONPG["PostgreSQL\n(Neon / RDS — not yet chosen)"]
    end

    USER -->|HTTPS| CF
    CF -->|Lambda URL\nresponse streaming| WEBFN
    WEBFN -->|SendMessage| GENQ
    WEBFN -->|ReadWrite| S3APP
    WEBFN -->|GetParameter| SSM
    WEBFN -->|PutMetricData| CW
    WEBFN -->|JWT verify| CLERK
    WEBFN -->|Webhook| STRIPE
    WEBFN -->|SQL| NEONPG

    GENQ -->|SqsEventSource\nbatchSize=1| WORKERFN
    CAPQ -->|SqsEventSource\nbatchSize=1| WORKERFN
    WORKERFN -->|ReadWrite| S3APP
    WORKERFN -->|InvokeModel| BED
    WORKERFN -->|Generate image| OAI
    WORKERFN -->|Generate image| REP
    WORKERFN -->|GetParameter| SSM
    WORKERFN -->|PutMetricData| CW
    WORKERFN -->|SQL| NEONPG

    GENQ -->|maxReceive exceeded| DLQ
    CAPQ -->|maxReceive exceeded| DLQ

    WEBFN -.->|Errors| SENTRY
    WORKERFN -.->|Errors| SENTRY
```

---

## 3. Request Data Flow — Image Generation

End-to-end path from user clicking Generate to seeing results.

```mermaid
sequenceDiagram
    actor User
    participant CF as CloudFront
    participant Web as Lambda (Web)
    participant DB as PostgreSQL
    participant SQS as SQS Generations
    participant Worker as Lambda (Worker)
    participant AI as AI Provider
    participant S3 as S3 (Assets)

    User->>CF: POST /api/generations
    CF->>Web: forward (streaming)
    Web->>DB: insert generation row (status=queued)
    Web->>SQS: SendMessage {generationId, ...}
    Web-->>User: 201 {generationId}

    User->>CF: GET /api/generations/:id (poll)
    CF->>Web: forward
    Web->>DB: select generation row
    Web-->>User: {status: "queued"}

    SQS->>Worker: SqsEventSource trigger
    Worker->>DB: update status=processing
    Worker->>AI: generate image(s)
    AI-->>Worker: image bytes
    Worker->>S3: put image PNG
    Worker->>DB: update status=done, variants[{s3Key}]
    Worker-->>SQS: delete message (implicit on Lambda success)

    User->>CF: GET /api/generations/:id (poll)
    CF->>Web: forward
    Web->>DB: select (status=done)
    Web->>S3: presign variant URLs
    Web-->>User: {status: "done", variants: [...urls]}
```

---

## 4. CDK Stack Dependency Graph

```mermaid
graph LR
    STORAGE["StorageStack\n(S3 buckets)"]
    QUEUES["QueueStack\n(SQS)"]
    WORKER["WorkerStack\n(Lambda)"]
    WEB["WebStack\n(Lambda + CloudFront)"]

    STORAGE -->|bucketArn| WORKER
    STORAGE -->|bucketArn| WEB
    QUEUES -->|queueArn| WORKER
    QUEUES -->|queueUrl| WEB
```

---

## 5. Package → Runtime Map

Which monorepo packages run where at cloud runtime.

| Package | Web Lambda | Worker Lambda | Build-time only |
|---------|-----------|---------------|-----------------|
| `apps/web` | ✓ | | |
| `apps/worker` | | ✓ | |
| `packages/api` | ✓ | ✓ | |
| `packages/auth` | ✓ | | |
| `packages/billing` | ✓ | ✓ | |
| `packages/db` | ✓ | ✓ | |
| `packages/gateway` | | ✓ | |
| `packages/observability` | ✓ | ✓ | |
| `packages/queue` | ✓ | ✓ | |
| `packages/renderer` | | ✓ | |
| `packages/shared` | ✓ | ✓ | |
| `packages/storage` | ✓ | ✓ | |

---

## 6. Open Items / Not Yet Decided

| Item | Status | Notes |
|------|--------|-------|
| PostgreSQL host | **Not chosen** | Neon (serverless), RDS, or other. pgvector required. Recommendation: Neon. |
| Stage env vars | **Placeholder** | Must be populated via `aws ssm put-parameter` before deploy. Nine params: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `REPLICATE_API_TOKEN`, `RECRAFT_API_KEY`, `SENTRY_DSN`. |
| CDK deploy CI | **Set up** | `.github/workflows/deploy.yaml` is fully implemented: staging deploy on push to main, production after staging succeeds. Uses OIDC role assumption. |
| Captions worker entry | **Verified** | `apps/worker/src/caption-handler.ts` — `CaptionWorker` class fully implemented. Reads caption job, calls OpenAI text model, stores output, commits/releases credits via Ledger. |
