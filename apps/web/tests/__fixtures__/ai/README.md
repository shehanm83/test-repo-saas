# AI provider fixtures

Captured request/response bodies for replaying provider calls without burning
real API credit. Captured by running the worker with `AI_MODE=record` and a
real key in `.env.local`; replayed by the existing unit tests when the key
isn't present.

Subdirectories track one fixture file per `<test-name>.json`.

## bfl/

Smoke target: a single `flux-pro-1.1` (`photoreal-pro`) generation at the
smallest seeded size (1024×1024). Pending: capture against `BFL_API_KEY`.

## google-image/

Smoke target: one `gemini-2.5-flash-image` (`nano-banana`) generation at 1K.
Pending: `GOOGLE_GENAI_API_KEY` is not yet provisioned in this environment;
plan B4 explicitly allows skipping when the key is absent.
