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
  -AdminPassword "<admin-password>"
```

Optional (when credentials are unavailable):
```powershell
pwsh -File scripts/staging/run-staging-smoke.ps1 `
  -ApiBaseUrl "https://<api-staging>" `
  -AdminBaseUrl "https://<admin-staging>" `
  -StorefrontBaseUrl "https://<storefront-staging>" `
  -AllowMissingAdminAuth
```

## Required Checks
- [ ] API `/health` returns 200.
- [ ] API `/` returns 200.
- [ ] API `/metrics` is reachable (200/401/403 accepted).
- [ ] Admin `/login` returns 200.
- [ ] Storefront `/` returns 200.
- [ ] Admin API login returns token (or documented skip if `-AllowMissingAdminAuth`).
- [ ] CRM leads endpoint returns 200 with admin token (or documented skip).

## Evidence Artifacts
- JSON output file: `artifacts/staging/staging-smoke-<timestamp>.json`
- Screenshots:
  - [ ] Admin login
  - [ ] CRM leads list
  - [ ] Storefront home
- Optional links (logs/dashboard/trace IDs):

## Final Gate
- [ ] All required checks passed.
- [ ] Evidence attached to release/PR.
- [ ] Approved for production rollout.
