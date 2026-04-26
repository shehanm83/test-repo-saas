import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import * as Sentry from "@sentry/node";

import type { Telemetry } from "./types";

export interface SentryTelemetryOptions {
  dsn: string;
  environment: string;
  cloudwatchRegion?: string;
  cloudwatchNamespace?: string;
  tracesSampleRate?: number;
}

export class SentryTelemetry implements Telemetry {
  private readonly cw?: CloudWatchClient;
  private readonly namespace: string;

  constructor(opts: SentryTelemetryOptions) {
    Sentry.init({
      dsn: opts.dsn,
      environment: opts.environment,
      tracesSampleRate: opts.tracesSampleRate ?? 0.1,
    });
    this.namespace = opts.cloudwatchNamespace ?? "Studio";
    if (opts.cloudwatchRegion) {
      this.cw = new CloudWatchClient({ region: opts.cloudwatchRegion });
    }
  }

  captureException(err: unknown, ctx?: Record<string, unknown>): void {
    Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
  }

  metric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.cw) return;
    const dimensions = tags
      ? Object.entries(tags).map(([Name, Value]) => ({ Name, Value }))
      : undefined;
    void this.cw
      .send(
        new PutMetricDataCommand({
          Namespace: this.namespace,
          MetricData: [
            {
              MetricName: name,
              Value: value,
              Unit: "None",
              ...(dimensions ? { Dimensions: dimensions } : {}),
            },
          ],
        }),
      )
      .catch(() => undefined);
  }

  async startSpan<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    return Sentry.startSpan({ name }, async () => fn());
  }
}
