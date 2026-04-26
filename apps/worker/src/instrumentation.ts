import * as Sentry from "@sentry/node";

export function initWorkerSentry(): void {
  if (process.env.OBSERVABILITY === "sentry" && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT ?? "local",
      tracesSampleRate: 0.1,
    });
  }
}
