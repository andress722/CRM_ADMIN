# Security and logging guide

This guide covers safe SDK usage, logging hygiene, and basic observability practices for this repo.

## 1) Logging hygiene

- Never log access tokens, refresh tokens, API keys, cookies, or webhook secrets.
- Avoid logging full prompts or user-provided content when it may contain PII.
- Prefer structured logs with explicit fields (e.g., `user_id`, `request_id`).
- Redact emails, phone numbers, CPF, and payment identifiers before logging.

**Recommended redactions**
- Email: replace local-part with `***` (example: `***@domain.com`).
- Phone/CPF: keep last 2-4 digits only.
- Tokens: replace with `***` or hash.

## 2) SDK usage safety

- Use `autoStart=false` when you need explicit lifecycle control.
- Handle connection failures with retry/backoff (supported by `connectionRetry`).
- Treat tool results as untrusted input; validate before persisting.
- Do not enable debug logs in production without redaction.

## 3) Sentry and PII

- Keep `SendDefaultPii=false` in Sentry configuration.
- Use low sampling for traces in production (e.g., 0.01-0.1).
- Only set `SENTRY_DSN` in environments where you want error collection.
- Keep `SENTRY_AUTH_TOKEN` only in CI when uploading source maps.

## 4) Secrets and configuration

- Use environment variables or secret managers for credentials.
- Do not commit `.env.local` files; use `.env.local.example` instead.
- Rotate credentials regularly (payment, webhook, email providers).

## 5) Incident response basics

- Ensure logs include a correlation ID (`CorrelationId`) on API requests.
- Document rollback steps for the latest deploy.
- Capture relevant errors with Sentry and alert on spikes.

## 6) Quick checklist

- [ ] Tokens/secrets never appear in logs.
- [ ] Sentry PII disabled.
- [ ] Error rates and latencies visible in dashboards.
- [ ] Retry/backoff configured for CLI connectivity.
