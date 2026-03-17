# Integration Pending Log

## Generated
- Date (UTC): 2026-03-13
- Branch: `automation/automation-scripts`
- Scope: API (`src`), Admin (`admin-frontend`), Storefront (`info-tech-gamer-storefront-build`), docs.

## Implemented in this cycle (security + browser request hardening)
- [x] Refresh token removed from auth response payloads (`/auth/login`, `/auth/register`, `/auth/social/*`, `/auth/refresh`).
- [x] Refresh token flow now prioritizes `HttpOnly` cookie; body fallback is optional via `Auth:AllowRefreshTokenInBody` (default `false`).
- [x] CSRF protection enabled for session endpoints:
  - protected routes: `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`
  - cookie: `csrf_token`
  - header required: `X-CSRF-Token`
- [x] Admin frontend now forwards CSRF header automatically on refresh/logout requests.
- [x] Storefront no longer stores refresh token in `localStorage`; refresh uses cookie + CSRF header.
- [x] Auth responses now include `Cache-Control: no-store` on `/api/v1/auth/*`.
- [x] Auth controller no longer returns raw internal exception messages in response payloads.
- [x] BFF proxy implemented in Admin and Storefront (`/api/bff/*`) to avoid direct browser calls to API and keep access token in `HttpOnly` cookie on frontend server side.
- [x] Access token migrated to in-memory storage on frontend clients (no `localStorage` for token persistence).
- [x] Rate-limit rules moved to versioned file `src/Ecommerce.API/rate-limits.json` and loaded directly from file (not env override for rules).
- [x] Rate limits expanded by route class (auth, checkout/payments, webhooks, and sensitive admin actions).
- [x] Request body size limits by route group added (auth/payments/webhooks/uploads/default).
- [x] Admin pages removed direct `AuthService.getToken()` guards and now rely on cookie/BFF session flow.
- [x] Frontends now enforce baseline browser security headers (CSP + anti-clickjacking + anti-sniff + referrer + permissions + COOP).
- [x] BFF auth routes now return explicit `no-store` cache headers.
- [x] BFF now blocks cross-site mutation requests (`POST`/`PUT`/`PATCH`/`DELETE`) via `Origin` + `Sec-Fetch-Site` validation.
- [x] BFF now enforces request payload size limits by route class and returns `413` before upstream forwarding when exceeded.
- [x] BFF now requires `X-Action-Nonce` on high-risk mutation routes (checkout/subscriptions/order-from-cart).
- [x] BFF now enforces `no-store` cache headers for auth and mutating operations.
- [x] Frontends migrated to CSP nonce mode in production (`script-src` nonce + `strict-dynamic`; no script `unsafe-inline`/`unsafe-eval`).
- [x] Frontends now enforce `style-src` nonce in production (no style `unsafe-inline`).
- [x] CSP nonce enforcement moved to `proxy.ts` (Next 16) with configurable allowlists (`NEXT_PUBLIC_CSP_*`).
- [x] Admin notifications WebSocket switched to cookie-based session (no token in URL query).
- [x] Automated BFF security tests added (`tests/bff-security.spec.ts`) for `403` missing `X-Action-Nonce` and `413` oversized payload.
- [x] CI workflows now run BFF security tests for admin + storefront before E2E.
- [x] CI uploads dedicated HTML reports and test-results artifacts for BFF security tests (admin + storefront).
- [x] Dedicated `BFF Security` workflow added with independent status checks (`Admin BFF Security`, `Storefront BFF Security`).

## Current integration registry

### Auth and session
- API JWT access token + rotating refresh cookie.
- Admin frontend integrated with refresh-by-cookie strategy.
- Storefront integrated with refresh-by-cookie strategy.
- CSRF validation active for auth session endpoints.

### Payments and billing
- Mercado Pago checkout/transparent checkout integration active.
- Subscription billing webhook with HMAC and idempotency hardening active.
- Recurring billing provider path implemented in code (`Subscriptions:Billing:*`, `POST /api/v1/subscriptions/billing/run`, billing webhook HMAC/idempotent, success/failure tests). Pending: end-to-end evidence in staging with a real provider credential set.

### Shipping
- Correios provider integration present.
- Shipping webhook endpoint present.

### Messaging and notifications
- Email providers: Console/SendGrid/SES paths configured.
- Webhook delivery worker + retry flow present.

### Observability and operations
- Sentry integration toggleable via config, default PII disabled.
- OpenTelemetry wiring present.
- Metrics endpoint exists (`/metrics`, admin protected).
- Dashboard/alert code path versioned (`/api/v1/admin/ops/overview`, Prometheus rules, runbook, staging smoke + bundle integration). Pending: live validation with staging evidence and deploy-failure signal from CI/platform.

### Product surfaces
- Admin: CRM + product CRUD integrated.
- Storefront: catalog/cart/checkout/auth integrated.

## Pending integrations (updated)

### P0
- [ ] Staging evidence with successful smoke and authenticated flows attached to release artifacts.
- [ ] Final staging validation for API root/health/metrics + admin login + storefront home (run `docs/CSP_STAGING_SMOKE.md`).

### P1
- [x] Operational dashboards (error rate, p95, webhook/job visibility) linked and validated locally via `admin-frontend/app/admin/page.tsx` + `/api/v1/admin/ops/overview` (2026-03-14).
- [ ] Alert set live (5xx, p95 latency, deploy failure). Ingestão de sinal de deploy implementada via `/api/v1/admin/ops/deploy-signal` + `.github/workflows/deploy-signal.yml` (2026-03-15); falta validação com secrets em staging.
- [ ] CRM E2E in staging gate with evidence.
- [ ] Storefront full journey in staging (`catalog -> cart -> checkout -> webhook`). Fluxo local coberto por teste integrado no backend com provider stub + webhook assinado; falta evidência em staging.

### Product/roadmap
- [x] Recorrência real com gateway + webhooks de ciclo completo no código local; falta evidência/staging com credenciais reais.
- [x] Busca avançada com engine dedicada (Elastic/Meilisearch) pronta via configuração com fallback local.
- [x] Hardening mobile (sessão/deep links/push backend). Backend agora inclui sessão mobile persistente sem cookie (`/api/v1/auth/mobile/login|refresh|logout`), registro de device e deep links permitidos (`Mobile:DeepLinks:AllowedSchemes`) com testes automatizados (2026-03-15).

## Recommended next improvements
- [x] Move access token from `localStorage` to in-memory + silent refresh flow for stronger XSS resilience.
- [x] Add strict request body limits per endpoint group (auth/payments/uploads) to reduce abusive payload surface (middleware + 413 responses in API/BFF validated in code/tests on 2026-03-15).
- [x] Add WAF/rate-limit rules by route class (auth, webhook, checkout) with alert coupling (versioned `rate-limits.json` + Prometheus alert rules validated in repo on 2026-03-15).
- [x] Add signed request nonce for high-risk browser operations (payments/subscriptions/order-from-cart critical mutations) via `X-Action-Nonce` at BFF.
























