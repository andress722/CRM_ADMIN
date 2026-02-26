import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;
const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0);

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
});
