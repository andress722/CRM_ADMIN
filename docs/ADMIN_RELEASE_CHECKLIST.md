# Admin Release Checklist (Staging -> Production)

Use this checklist before production cut for admin panel changes.

## Build and test gate
- [ ] `npm run build` passes in `admin-frontend`.
- [ ] Playwright E2E passes for admin critical paths.
- [ ] API build/test passes (`dotnet build` + targeted tests).

## Staging functional gate
- [ ] Login page available (`/login`).
- [ ] CRM leads list available with admin token.
- [ ] CRM create/update/delete flow validated (manual or smoke `-RunCrmCrud`) for leads, opportunities and activities.
- [ ] No blocking console/runtime errors in admin UI.

## Security and config gate
- [ ] `NEXT_PUBLIC_API_URL` points to correct staging/prod API.
- [ ] CORS origins include final admin domain.
- [ ] Sentry configured with `SendDefaultPii=false` in backend.
- [ ] Secrets are in environment/secret manager (no hardcoded credentials).

## Observability gate
- [ ] Dashboard panels for API error rate and p95 latency are reachable.
- [ ] Alerts enabled for 5xx and latency p95.
- [ ] Incident runbook link included in release notes.

## Evidence gate
- [ ] `artifacts/staging/staging-smoke-<timestamp>.json` attached.
- [ ] `artifacts/staging/STAGING_EVIDENCE_SUMMARY.md` attached.
- [ ] Screenshots attached: login, CRM leads, storefront home.

## Approval
- [ ] Tech owner approved.
- [ ] Release manager approved.
- [ ] Rollback plan documented.

