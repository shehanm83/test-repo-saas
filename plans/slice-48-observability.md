# Slice 48 — Observability skeleton

**Phase:** 16 — Hardening
**Depends on:** 35, 30
**Spec references:** [Architecture § 3.9 (Observability v1)](../specs/2026-04-25-layertone-v1-architecture.md), [decision D9 (Sentry + CloudWatch + OTEL placeholder)](../../../C--personal-saas-img-gen/memory/project_decisions.md).

**Definition of done:**
- Sentry initialized in both `apps/web` and `apps/worker` (server + client)
- Custom metrics emitted to CloudWatch (generation duration, queue depth, provider latency, ledger reservations) — using AWS SDK PutMetricData
- OpenTelemetry instrumentation hooks placed but no collector wired (per decision D9)
- A `Telemetry` adapter implementation `SentryTelemetry` registered when `OBSERVABILITY=sentry`

---

## Files

**Create:**
- `packages/observability/{package.json,tsconfig.json,src/{index.ts,sentry.ts,cloudwatch.ts,otel-stub.ts}}`
- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/instrumentation.ts`
- `apps/worker/src/instrumentation.ts`

**Modify:**
- `packages/shared/src/adapters/factory.ts` (wire telemetry)

---

## Tasks

- [ ] **Step 1 — Add deps**

```bash
pnpm --filter @layertone/web add @sentry/nextjs
pnpm --filter @layertone/worker add @sentry/node @sentry/profiling-node
pnpm --filter @layertone/observability add @aws-sdk/client-cloudwatch @sentry/node
```

- [ ] **Step 2 — `SentryTelemetry`**

```ts
// packages/observability/src/sentry.ts
import * as Sentry from "@sentry/node";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import type { Telemetry } from "@layertone/shared";

export class SentryTelemetry implements Telemetry {
  private cw?: CloudWatchClient;
  constructor(opts: { dsn: string; environment: string; cloudwatchRegion?: string }) {
    Sentry.init({ dsn: opts.dsn, environment: opts.environment, tracesSampleRate: 0.1 });
    if (opts.cloudwatchRegion) this.cw = new CloudWatchClient({ region: opts.cloudwatchRegion });
  }

  captureException(err: unknown, ctx?: Record<string, unknown>): void {
    Sentry.captureException(err, { extra: ctx });
  }

  metric(name: string, value: number, tags?: Record<string, string>): void {
    if (this.cw) {
      void this.cw.send(new PutMetricDataCommand({
        Namespace: "Studio",
        MetricData: [{
          MetricName: name, Value: value, Unit: "None",
          Dimensions: tags ? Object.entries(tags).map(([k, v]) => ({ Name: k, Value: v })) : undefined,
        }],
      })).catch(() => undefined);
    }
  }

  async startSpan<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    return Sentry.startSpan({ name }, async () => fn());
  }
}

export class NoopTelemetry implements Telemetry {
  captureException(): void {}
  metric(): void {}
  async startSpan<T>(_n: string, fn: () => Promise<T> | T): Promise<T> { return fn(); }
}
```

- [ ] **Step 3 — Wire factory**

```ts
const telemetry = config.observability.mode === "sentry"
  ? new SentryTelemetry({ dsn: config.observability.sentryDsn!, environment: config.observability.environment, cloudwatchRegion: config.storage.region })
  : new NoopTelemetry();
```

- [ ] **Step 4 — Web Sentry config**

```ts
// apps/web/sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
```

(Mirror for client config.)

`apps/web/instrumentation.ts`:
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}
```

- [ ] **Step 5 — Emit key metrics**

In worker handler (slice 30):
```ts
this.adapters.telemetry.metric("variant.duration_ms", Date.now() - start, { model: imageRes.modelUsedCode });
```

In generation API (slice 29):
```ts
this.adapters.telemetry.metric("generation.created", 1, { plan: plan.code });
```

In ledger (slice 19):
```ts
this.adapters.telemetry.metric("ledger.reservation", entry.amount, { kind: entry.kind });
```

(Pass telemetry into the constructors — small refactor.)

- [ ] **Step 6 — OTEL placeholder hooks**

```ts
// packages/observability/src/otel-stub.ts
export function tagSpan(name: string, attributes: Record<string, string | number | boolean>) {
  // Placeholder: when OTEL collector is wired, this attaches attributes to current span.
  // For v1, this is a no-op tagged for future grep-and-replace.
  void name; void attributes;
}
```

Sprinkle `tagSpan("generation.create", { workspaceId, plan })` calls at critical seams. They cost zero today.

- [ ] **Step 7 — Commit**

```bash
git add -A
git commit -m "feat(observability): Sentry + CloudWatch metrics + OTEL placeholder hooks"
```

---

## Verification

```bash
OBSERVABILITY=sentry SENTRY_DSN=... pnpm --filter @layertone/worker dev
# trigger a generation, observe Sentry transaction + CloudWatch metric appear
```

## Commit message

```
feat(observability): Sentry + CloudWatch metrics + OTEL placeholder hooks
```
