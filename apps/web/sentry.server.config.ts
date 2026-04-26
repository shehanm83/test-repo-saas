// Loaded dynamically from instrumentation.ts only when SENTRY_DSN is set.
// Lazy-require keeps @sentry/nextjs + @opentelemetry/instrumentation off the
// dev webpack graph in OBSERVABILITY=none mode (huge dev-server speedup).

export {};

if (process.env.SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require("@sentry/nextjs") as typeof import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? "local",
    tracesSampleRate: 0.1,
  });
}
