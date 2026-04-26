export function initWorkerSentry(): void {
  if (process.env.OBSERVABILITY === "sentry" && process.env.SENTRY_DSN) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/node") as typeof import("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT ?? "local",
      tracesSampleRate: 0.1,
    });
  }
}
