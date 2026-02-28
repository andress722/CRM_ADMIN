# Integration Pending Log

## Generated
- Date (UTC): 2026-02-28
- Branch: `automation/automation-scripts`
- Source of truth:
  - `docs/PENDENCIAS_IMPLEMENTACAO.md`
  - `docs/STAGING_RELEASE_EVIDENCE.md`
  - `artifacts/staging/staging-smoke-20260228-045930.json`

## Current Runtime Snapshot
- Latest smoke evidence is still failing (`passed: false`, 5 failing checks).
- Code-level fixes applied in this repository:
  - Root route `/` mapped with 200 response.
  - Forwarded headers/trust proxy support implemented in API.
  - Staging release gate workflow added (`.github/workflows/staging-release-gate.yml`).
  - Includes staging URL preflight (`scripts/staging/preflight-staging-urls.ps1`) to detect deployment_not_found/unreachable domains early.
  - Event worker now uses progressive idle polling backoff.
- Remaining issues need deploy/runtime validation in staging.

## Critical Pending Integrations (P0)
- [ ] **Staging smoke must pass 100% with real URLs and creds**
  - Current evidence file: `artifacts/staging/staging-smoke-20260228-045930.json` = `passed: false` (5 failures).
  - Required endpoints still not validated in evidence gate:
    - API `/health`
    - API `/`
    - API `/metrics`
    - Admin `/login`
    - Storefront `/`
- [ ] **Release evidence attachment process not completed**
  - Automation now generates staging evidence summary (`scripts/staging/generate-staging-evidence-summary.ps1`).
  - Automation now builds release evidence bundle (`scripts/staging/build-release-evidence-bundle.ps1`).
  - PR comment automation available in staging gate workflow (input `pr_number`).
  - Automation exists, but evidence still needs to be attached in release/PR.

## High Priority Pending Integrations (P1)
- [ ] **Operational dashboards integrated and validated**
  - Error rate, latency (p95), webhook/job visibility for API + frontends.
- [ ] **Production alerting minimum set integrated**
  - 5xx rate alert, p95 latency alert, deploy failure alert.
- [ ] **CRM staging evidence integrated**
  - End-to-end proof for list/create/edit/delete + validation errors.
- [ ] **CRM E2E on staging integrated in release gate**
  - API smoke now supports CRM CRUD checks (`-RunCrmCrud`), pending successful staging run.
- [x] **Admin release checklist versionado** (`docs/ADMIN_RELEASE_CHECKLIST.md`)
- [ ] **Admin release checklist executado** antes do corte de produção

## Product Integrations Still Missing

### CRM
- [x] CRM operations runbook documentado no repositório (`docs/CRM_OPERATIONS_RUNBOOK.md`).
- [ ] Aprovação operacional do runbook em cerimônia de release.

### Storefront
- [ ] Real recurring billing integration (gateway + renewal/failure/cancel webhooks).
- [ ] Advanced search integration (Elastic/Meilisearch + facets/ranking).
- [ ] Mobile hardening integrations (session persistence, deep links, push via backend).
- [ ] Full staging journey validated (catalog -> cart -> checkout -> webhook).

### Admin
- [ ] Operational dashboards integration (errors/latency/jobs/webhooks) finalized for panel operations.

## Platform/Infra Technical Debt to Integrate
- [x] Add root route (`/`) with 200 response for platform probes.
- [x] Forwarded headers/trust proxy integration to remove HTTPS redirect warning in Render.
- [x] Event worker polling backoff integration (reduce noisy 1s DB polling when queue empty).
- [ ] Confirm CLI connectivity retry/backoff integration in SDK modules (`nodejs/python/go/dotnet`) when repository segment is available.

## Security/Compliance Pending from Checklist
- [ ] `docs/SECURITY_GUIDE.md`: mark and validate
  - Sentry PII disabled (runtime evidence)
  - Error/latency visible in dashboards
  - CLI connectivity retry/backoff configured

## Acceptance Criteria to Close This Log
- [ ] Staging smoke file reports `passed: true` with authenticated checks.
- [ ] Evidence attached in release artifacts.
- [ ] Dashboards + alerts operational and linked.
- [ ] CRM/Admin/Storefront staging gates completed.
- [ ] Root probe and proxy-related warnings resolved in runtime logs.

<!-- AUTO_STATUS_START -->
## Automated Status (Generated)
- Updated at (UTC): 2026-02-28T07:25:59.8053122Z
- Latest preflight: staging-preflight-20260228-063119.json (passed=False, failedChecks=3)
  - Preflight fail: API root preflight [http_404] status=404
  - Preflight fail: Admin login preflight [deployment_not_found] status=404
  - Preflight fail: Storefront home preflight [deployment_not_found] status=404
- Latest smoke: staging-smoke-20260228-062537.json (passed=False, failedChecks=5, totalChecks=7)
  - Smoke fail: API health status=404
  - Smoke fail: API root status=404
  - Smoke fail: API metrics endpoint reachable status=404
  - Smoke fail: Admin login page status=404
  - Smoke fail: Storefront home status=404
<!-- AUTO_STATUS_END -->






