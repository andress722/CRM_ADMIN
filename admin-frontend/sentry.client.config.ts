import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const tracesSampleRate = Number(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ??
    process.env.SENTRY_TRACES_SAMPLE_RATE ??
    0,
);

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.SENTRY_ENVIRONMENT ??
    process.env.NODE_ENV,
});
