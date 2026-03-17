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

- [x] Tokens/secrets never appear in logs (CI guard + redaction on scripts/services).
- [ ] Sentry PII disabled.
- [ ] Error rates and latencies visible in dashboards.
- [ ] Retry/backoff configured for CLI connectivity.

## 7) Reverse proxy and secure cookies

- Configure `Networking:TrustedProxies` in `appsettings`/env when running behind ingress/load balancers.
- Keep refresh token cookies `HttpOnly` and `Secure` in non-development environments.
- Do not return refresh tokens in JSON payloads; keep refresh flow cookie-based to reduce browser exposure.
- If local HTTP dev is required, use `Auth:AllowInsecureCookiesInDevelopment=true` only in dev.
- CSRF protection uses double-submit cookie for auth session endpoints:
  - cookie: `csrf_token`
  - header required: `X-CSRF-Token`
  - enforced on `/api/v1/auth/refresh` and `/api/v1/auth/logout`.




## 8) BFF (Browser -> Frontend Server -> API)

- Use BFF routes (/api/bff/*) for browser calls instead of hitting API origin directly.
- Keep API access token in HttpOnly cookie at BFF layer (`bff_access_token`) and inject Authorization server-side.
- Keep refresh flow cookie-based + CSRF (csrf_token + X-CSRF-Token).
- Never persist refresh tokens in browser storage.
- Apply per-route payload limits to reduce abuse and accidental oversized payload exposure.


- Keep access token in-memory only on SPA clients; do not persist in browser storage.
- Avoid passing access tokens in URL query strings (including WebSocket URLs); prefer cookie-authenticated channels.



## 9) Frontend security headers

- Frontends (Next.js) now enforce baseline browser security headers globally: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.
- BFF auth routes (`/api/bff/auth/*`) now explicitly return `Cache-Control: no-store` (+ `Pragma`/`Expires`) to reduce credential/payload caching risks in intermediaries/browsers.




## 10) BFF cross-site mutation guard

- BFF now rejects cross-site mutation requests (POST, PUT, PATCH, DELETE) when browser signals indicate cross-site context (Sec-Fetch-Site: cross-site) or when Origin does not match request origin.
- This adds another browser-layer protection against CSRF-style request triggering and credentialed payload submission from external origins.

## 11) CSP nonce mode (production)

- Frontends now issue `Content-Security-Policy` from `middleware.ts` with per-request nonce (`x-nonce`) in production.
- `script-src` in production is nonce-based with `strict-dynamic` (no script `unsafe-inline`/`unsafe-eval`).
- Development keeps permissive script policy (`unsafe-inline`/`unsafe-eval`) to preserve local tooling/HMR.
- `style-src` in production is also nonce-based (no `unsafe-inline`), aligned with script hardening.


## 12) CSP allowlist envs

- CSP in frontends is emitted from proxy.ts (Next 16) with per-request nonce.
- Use these env vars to extend production allowlists without code change:
  - NEXT_PUBLIC_CSP_SCRIPT_SRC (comma-separated)
  - NEXT_PUBLIC_CSP_CONNECT_SRC (comma-separated)
  - NEXT_PUBLIC_CSP_IMG_SRC (comma-separated)
  - NEXT_PUBLIC_CSP_FRAME_SRC (comma-separated)
- Defaults already include Mercado Pago SDK/frames/connect endpoints and Sentry ingest.


## 13) Rate limits by route class

- Versioned rules in src/Ecommerce.API/rate-limits.json now include route classes for auth, checkout/payments, webhooks, and sensitive admin operations.
- This reduces brute-force and abuse surface on high-risk endpoints while keeping a global baseline limit.


## 14) BFF payload limits and cache hardening

- BFF now enforces request body limits before forwarding to API (auth, checkout, upload-like routes, default).
- Oversized payloads are rejected with 413 Payload Too Large at frontend edge/BFF layer.
- BFF responses for auth and mutating operations now enforce Cache-Control: no-store (+ Pragma/Expires).


## 15) Action nonce for critical browser operations

- BFF now requires X-Action-Nonce (matching csrf_token) for high-risk mutation routes (checkout, transparent payment, order-from-cart, subscription billing/cancel/retry).
- Storefront client automatically sends X-Action-Nonce on those routes using the current CSRF cookie value.
- Requests missing this nonce are rejected with 403 at BFF before upstream forwarding.


## 16) Branch protection recommendation

- Enforce BFF Security workflow checks as required in branch protection for main/master to block merges on BFF security regression.
- Required checks recommended:
  - BFF Security / Admin BFF Security`r
  - BFF Security / Storefront BFF Security`r


## 17) Apply branch protection via script

- Script: scripts/github/set-branch-protection.ps1`r
- Required env: GH_TOKEN with repo admin permissions.
- Example:
  - powershell -ExecutionPolicy Bypass -File scripts/github/set-branch-protection.ps1 -Owner andress722 -Repo CRM_ADMIN`r
- Dry-run:
  - powershell -ExecutionPolicy Bypass -File scripts/github/set-branch-protection.ps1 -Owner andress722 -Repo CRM_ADMIN -DryRun`r

