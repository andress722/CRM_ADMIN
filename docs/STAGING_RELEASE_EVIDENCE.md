# Staging Release Evidence

Use this checklist before promoting to production.

## Metadata
- Date (UTC):
- Release/Commit:
- Operator:
- API URL:
- Admin URL:
- Storefront URL:

## Command
```powershell
pwsh -File scripts/staging/run-staging-smoke.ps1 `
  -ApiBaseUrl "https://<api-staging>" `
  -AdminBaseUrl "https://<admin-staging>" `
  -StorefrontBaseUrl "https://<storefront-staging>" `
  -AdminEmail "<admin-email>" `
  -AdminPassword "<admin-password>" `
  -RunCrmCrud
```

Optional (when credentials are unavailable):
```powershell
pwsh -File scripts/staging/run-staging-smoke.ps1 `
  -ApiBaseUrl "https://<api-staging>" `
  -AdminBaseUrl "https://<admin-staging>" `
  -StorefrontBaseUrl "https://<storefront-staging>" `
  -AllowMissingAdminAuth
```

Preflight (recommended before smoke):
```powershell
pwsh -File scripts/staging/preflight-staging-urls.ps1 `
  -ApiBaseUrl "https://<api-staging>" `
  -AdminBaseUrl "https://<admin-staging>" `
  -StorefrontBaseUrl "https://<storefront-staging>"
```

Observability probe (recommended before bundle):
```powershell
pwsh -File scripts/observability/run-staging-observability-check.ps1 `
  -ApiBaseUrl "https://<api-staging>"
```

Bundle (gera indice + zip para anexar no PR/release):
```powershell
pwsh -File scripts/staging/build-release-evidence-bundle.ps1 `
  -StagingArtifactsDir "artifacts/staging" `
  -OutputDir "artifacts/staging" `
  -BundlePrefix "staging-release-evidence"
```

## Required Checks
- [ ] API `/health` returns 200.
- [ ] API `/` returns 200.
- [ ] API `/metrics` is reachable (200/401/403 accepted).
- [ ] Admin `/login` returns 200.
- [ ] Storefront `/` returns 200.
- [ ] Admin API login returns token (or documented skip if `-AllowMissingAdminAuth`).
- [ ] CRM leads list returns 200 with admin token.
- [ ] Admin ops overview returns 200 with admin token.
- [ ] CRM lead create returns 200 (`-RunCrmCrud`).
- [ ] CRM lead update returns 200 (`-RunCrmCrud`).
- [ ] CRM lead delete returns 204 (`-RunCrmCrud`).
- [ ] Observability evidence collected when alert/live probe is required for the release.

## Evidence Artifacts
- Preflight output file: `artifacts/staging/staging-preflight-<timestamp>.json`
- JSON output file: `artifacts/staging/staging-smoke-<timestamp>.json`
- Summary output file: `artifacts/staging/STAGING_EVIDENCE_SUMMARY.md`
- Observability output file: `artifacts/observability/staging-observability-check-<timestamp>.json`
- Bundle index file: `artifacts/staging/RELEASE_EVIDENCE_INDEX.md`
- Bundle zip file: `artifacts/staging/staging-release-evidence-<timestamp>.zip`
- Screenshots:
  - [ ] Admin login
  - [ ] CRM leads list
  - [ ] Storefront home
- Optional links (logs/dashboard/trace IDs):

## CI Automation Gate
- Workflow: `.github/workflows/staging-release-gate.yml`
- Required repo secrets:
  - `STAGING_API_URL`
  - `STAGING_ADMIN_URL`
  - `STAGING_STOREFRONT_URL`
  - `STAGING_ADMIN_EMAIL` and `STAGING_ADMIN_PASSWORD` (recommended)

PR comment automation (optional):
- In workflow `Staging Release Gate`, pass `pr_number` to post `PR_EVIDENCE_COMMENT.md` automatically on the PR.

## Final Gate
- [ ] All required checks passed.
- [ ] Evidence attached to release/PR.
- [ ] Approved for production rollout.
