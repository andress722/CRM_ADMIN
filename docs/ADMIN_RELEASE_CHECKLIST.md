# Admin Release Checklist (Staging -> Production)

Use this checklist before production cut for admin panel changes.

## Build and test gate
- [x] `npm run build` passes in `admin-frontend` (validated locally on 2026-03-15).
- [x] Playwright E2E passes for admin critical paths (`test:crm-critical` + `test:bff-security`, validated locally on 2026-03-15).
- [x] API build/test passes (`dotnet build` + `dotnet test tests/Ecommerce.API.Tests/Ecommerce.API.Tests.csproj`, validated locally on 2026-03-15).

## Staging functional gate
- [ ] Login page available (`/login`).
- [ ] CRM leads list available with admin token.
- [ ] Operational overview available with admin token (`GET /api/v1/admin/ops/overview`).
- [ ] CRM create/update/delete flow validated (manual or smoke `-RunCrmCrud`) for leads, opportunities and activities.
- [ ] No blocking console/runtime errors in admin UI.

## Security and config gate
- [ ] `NEXT_PUBLIC_API_URL` points to correct staging/prod API.
- [ ] CORS origins include final admin domain.
- [ ] Sentry configured with `SendDefaultPii=false` in backend.
- [ ] Secrets are in environment/secret manager (no hardcoded credentials).

## Observability gate
- [ ] Dashboard panels for API error rate and p95 latency are reachable.
- [ ] Smoke evidence confirms `Admin ops overview` check passed.
- [ ] Alerts enabled for 5xx and latency p95.
- [ ] Deploy-failure signal integrated from CI/deploy platform.
- [ ] Incident runbook link included in release notes.

## Evidence gate
- [ ] `artifacts/staging/staging-smoke-<timestamp>.json` attached.
- [ ] `artifacts/staging/STAGING_EVIDENCE_SUMMARY.md` attached.
- [ ] `artifacts/staging/RELEASE_EVIDENCE_INDEX.md` attached.
- [ ] `artifacts/observability/staging-observability-check-<timestamp>.json` attached when observability validation is executed.
- [ ] Screenshots attached: login, CRM leads, storefront home.

## Approval
- [ ] Tech owner approved.
- [ ] Release manager approved.
- [ ] Rollback plan documented.

