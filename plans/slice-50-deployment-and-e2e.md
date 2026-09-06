# Slice 50 — Deployment + E2E test suite

**Phase:** 17 — Marketing & deployment
**Depends on:** 03, all prior
**Spec references:** [Architecture § 3, § 7](../specs/2026-04-25-layertone-v1-architecture.md), [decision D9 (cost-conscious AWS picks)](../../../C--personal-saas-img-gen/memory/project_decisions.md).

**Definition of done:**
- OpenNext config in `apps/web` produces a Lambda-deployable bundle
- AWS CDK or Terraform IaC for: CloudFront distribution, Lambda functions (web + worker + renderer), S3 buckets (app + global), SQS main + DLQ, Parameter Store entries, CloudFront signed-URL key
- S3 lifecycle rule on `workspaces/*/uploads/inspiration/` — expire after 1 day
- CI: deploy job pushes to staging on `push to main`, manual approval gate to prod
- Playwright E2E test suite (4 critical journeys) wired into CI
- `pnpm --filter @layertone/web start:lambda` runs locally via `sst dev` or `aws-lambda-rie`

---

## Files

**Create:**
- `apps/web/open-next.config.ts`
- `infra/{package.json,tsconfig.json,bin/layertone.ts,lib/{web-stack.ts,worker-stack.ts,storage-stack.ts,queue-stack.ts}}` (CDK)
- `e2e/{playwright.config.ts,package.json,tests/{signup-and-generate.spec.ts,brand-setup.spec.ts,topup.spec.ts,credit-exhaustion.spec.ts}}`
- `.github/workflows/deploy.yaml`

**Modify:**
- `.github/workflows/ci.yaml` — flip `e2e` job `if: false` → `if: true`

---

## Tasks

### A — OpenNext + CDK

- [ ] **Step 1 — OpenNext**

```bash
pnpm --filter @layertone/web add -D @opennextjs/aws
```

`apps/web/open-next.config.ts`:
```ts
export default {
  default: { override: { wrapper: "aws-lambda-streaming" } },
  imageOptimization: { override: { wrapper: "aws-lambda" } },
};
```

`apps/web/package.json` script:
```json
"scripts": { "build:lambda": "next build && open-next build" }
```

- [ ] **Step 2 — CDK app**

```bash
pnpm --filter @layertone/infra add aws-cdk-lib constructs
pnpm --filter @layertone/infra add -D aws-cdk
```

`infra/lib/storage-stack.ts`:

```ts
import { Stack, RemovalPolicy, Duration } from "aws-cdk-lib";
import { Bucket, BucketEncryption, LifecycleRule } from "aws-cdk-lib/aws-s3";

export class StorageStack extends Stack {
  appBucket: Bucket;
  globalBucket: Bucket;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.appBucket = new Bucket(this, "AppAssets", {
      bucketName: "layertone-app-prod-assets",
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        { prefix: "workspaces/", noncurrentVersionExpiration: Duration.days(30) } as LifecycleRule,
        // Expire inspiration upload staging after 1 day
        { prefix: "workspaces/", abortIncompleteMultipartUploadAfter: Duration.days(1) } as LifecycleRule,
      ],
    });

    // Lifecycle rule on inspiration prefix specifically:
    this.appBucket.addLifecycleRule({
      prefix: "workspaces/", // narrow via tag-based rule in real impl, or explicit prefix per workspace not feasible
      expiration: undefined,
    });

    this.globalBucket = new Bucket(this, "GlobalAssets", {
      bucketName: "layertone-app-prod-global",
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
```

(Inspiration TTL: tagger upon upload — when `keys.inspirationUploadStaging` writes, attach `S3 object tag: ttl=24h`. Then add a global lifecycle rule by tag.)

`infra/lib/queue-stack.ts`: SQS main + DLQ; max receive count 3 → DLQ.

`infra/lib/web-stack.ts`: deploys OpenNext output as Lambdas + CloudFront origin via `@opennextjs/cdk` adapter.

`infra/lib/worker-stack.ts`: separate Lambda (or Fargate task) with SQS event source, IAM policies for: S3, Secrets, CloudWatch metrics, Bedrock invoke.

- [ ] **Step 3 — Parameter Store**

Use AWS Parameter Store SecureString for: Stripe keys, Clerk secrets, OpenAI/Anthropic/Replicate/Recraft tokens, Sentry DSN.

CDK:
```ts
import { StringParameter } from "aws-cdk-lib/aws-ssm";
new StringParameter(this, "StripeSecretKey", { parameterName: "/layertone/prod/STRIPE_SECRET_KEY", stringValue: "<placeholder — set out of band>", tier: ParameterTier.STANDARD });
```

(Real values populated via CLI: `aws ssm put-parameter --name /layertone/prod/STRIPE_SECRET_KEY --type SecureString --value $KEY`.)

### B — E2E

- [ ] **Step 4 — Playwright config**

`e2e/playwright.config.ts`:
```ts
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", screenshot: "only-on-failure", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.CI ? undefined : { command: "pnpm --filter @layertone/web dev", url: "http://localhost:3000", reuseExistingServer: true },
});
```

- [ ] **Step 5 — Critical journey tests**

`tests/signup-and-generate.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("signup → onboarding → generate → download", async ({ page }) => {
  await page.goto("/onboarding/brand/1-identify");
  await page.fill('input[name="name"]', "Test Brand");
  await page.click('button[type="submit"]');
  // ... walk steps; final → /generate

  await page.goto("/generate");
  // pick output target (Instagram Post)
  await page.click('button:has-text("Instagram")');
  await page.fill('textarea', "Christmas sale 30% off");
  await page.click('button:has-text("Generate")');

  await expect(page).toHaveURL(/\/generations\//);
  await expect(page.locator('[data-variant-status="completed"]').first()).toBeVisible({ timeout: 30000 });
  // download first variant
  const dl = await Promise.all([page.waitForEvent("download"), page.click('a[download]')]);
  expect(dl[0].suggestedFilename()).toMatch(/\.(png|jpg)$/);
});
```

`tests/brand-setup.spec.ts`: completes wizard.
`tests/topup.spec.ts`: opens `/billing`, clicks 750-credit pack, completes Stripe test-mode checkout, confirms balance updated.
`tests/credit-exhaustion.spec.ts`: drains credits via low Free balance, attempts a generation, expects 402 + friendly message.

- [ ] **Step 6 — Enable E2E in CI**

In `.github/workflows/ci.yaml`, replace the disabled `e2e` job:

```yaml
  e2e:
    needs: install
    runs-on: ubuntu-latest
    services:
      postgres: { image: pgvector/pgvector:pg16, env: { POSTGRES_USER: layertone, POSTGRES_PASSWORD: dev, POSTGRES_DB: layertone }, ports: ["5432:5432"], options: --health-cmd "pg_isready -U studio" --health-interval 5s --health-timeout 3s --health-retries 10 }
      minio:    { image: minio/minio, ports: ["9000:9000","9001:9001"], env: { MINIO_ROOT_USER: minio, MINIO_ROOT_PASSWORD: minio12345 }, options: --health-cmd "curl -f http://localhost:9000/minio/health/live" --health-interval 5s --health-retries 10 }
      elasticmq:{ image: softwaremill/elasticmq-native, ports: ["9324:9324"] }
    env:
      DATABASE_URL: postgres://layertone:dev@localhost:5432/studio
      AUTH_MODE: dev
      QUEUE_MODE: elasticmq
      SQS_ENDPOINT: http://localhost:9324
      AI_MODE: mock
      BILLING_MODE: stub
      STORAGE_MODE: minio
      S3_ENDPOINT: http://localhost:9000
      S3_REGION: us-east-1
      S3_ACCESS_KEY_ID: minio
      S3_SECRET_ACCESS_KEY: minio12345
      S3_BUCKET_APP: layertone-app
      S3_BUCKET_GLOBAL: layertone-global
      DEV_USER_ID: 00000000-0000-0000-0000-000000000001
      APP_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: "${{ env.PNPM_VERSION }}" }
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @layertone/db db:migrate
      - run: pnpm --filter @layertone/db exec tsx scripts/seed-pricebook.ts
      - run: pnpm --filter @layertone/web build
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm --filter @layertone/web exec next start &
      - run: pnpm --filter @layertone/worker exec tsx scripts/dev.ts &
      - run: sleep 10
      - run: pnpm --filter @layertone/e2e test
```

### C — Deploy workflow

- [ ] **Step 7 — `.github/workflows/deploy.yaml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @layertone/db db:migrate
        env: { DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }} }
      - run: pnpm --filter @layertone/web build:lambda
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_STAGING }}, aws-region: us-east-1 }
      - run: pnpm --filter @layertone/infra exec cdk deploy --require-approval never

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: { name: production, url: https://studio.example.com }  # gated by manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @layertone/db db:migrate
        env: { DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }} }
      - run: pnpm --filter @layertone/web build:lambda
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_PROD }}, aws-region: us-east-1 }
      - run: pnpm --filter @layertone/infra exec cdk deploy --context env=prod --require-approval never
```

- [ ] **Step 8 — Commit**

```bash
git add -A
git commit -m "feat(deploy): OpenNext + CDK infra + Playwright E2E + CI deploy pipeline"
```

---

## Verification

```bash
# Local E2E
pnpm --filter @layertone/web build
pnpm --filter @layertone/e2e test

# Local CDK synth
pnpm --filter @layertone/infra exec cdk synth

# Staging deploy (after secrets configured in GitHub)
gh workflow run deploy.yaml
```

## Commit message

```
feat(deploy): OpenNext + CDK infra + Playwright E2E + CI deploy pipeline
```
