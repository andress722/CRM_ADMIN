# CRM Phase 2 Validation (Critical Flows + Operations)

Date (UTC): 2026-03-10

## Scope completed
- Critical flow tests:
  - login/auth
  - CRM leads
  - CRM opportunities (deals)
  - CRM activities
- Final operational checklist and runbook references for staging/prod handoff.

## Automated validation executed
Command:
```powershell
dotnet test tests/Ecommerce.API.Tests/Ecommerce.API.Tests.csproj --filter "FullyQualifiedName~AuthFlowTests|FullyQualifiedName~AdminE2eTests" -v minimal
```

Result:
- Passed: 7
- Failed: 0
- Skipped: 0

Tests covered in this run:
- `AuthFlowTests.Register_Verify_Login_Refresh_Works`
- `AdminE2eTests.Crm_Lead_Flow_Works`
- `AdminE2eTests.Crm_Deal_Flow_Works`
- `AdminE2eTests.Crm_Activity_Flow_Works`
- `AdminE2eTests.Admin_Overview_Returns_Ok`
- `AdminE2eTests.Inventory_Adjust_Works`
- `AdminE2eTests.Refund_Flow_Works`

## Operation docs (final checklist)
Use these docs as the release handoff package:
- `docs/CRM_OPERATIONS_RUNBOOK.md`
- `docs/ADMIN_RELEASE_CHECKLIST.md`
- `docs/STAGING_RELEASE_EVIDENCE.md`

## Mandatory pre-release staging gate
1. Run preflight:
```powershell
pwsh -File scripts/staging/preflight-staging-urls.ps1 -ApiBaseUrl "https://<api-staging>" -AdminBaseUrl "https://<admin-staging>" -StorefrontBaseUrl "https://<storefront-staging>"
```
2. Run smoke with CRM CRUD:
```powershell
pwsh -File scripts/staging/run-staging-smoke.ps1 -ApiBaseUrl "https://<api-staging>" -AdminBaseUrl "https://<admin-staging>" -StorefrontBaseUrl "https://<storefront-staging>" -AdminEmail "<admin-email>" -AdminPassword "<admin-password>" -RunCrmCrud
```
3. Generate summary and bundle:
```powershell
pwsh -File scripts/staging/generate-staging-evidence-summary.ps1 -SmokeJsonPath "artifacts/staging/staging-smoke-latest.json"
pwsh -File scripts/staging/build-release-evidence-bundle.ps1 -StagingArtifactsDir "artifacts/staging" -OutputDir "artifacts/staging" -BundlePrefix "staging-release-evidence"
```

Release must be blocked if smoke is not 100% green.

## Staging execution evidence (2026-03-10)
Executed with:
- API: `https://crm-admin-8alt.onrender.com`
- Admin: `https://app.infotechgamer.site`
- Storefront: `https://app.infotechgamer.site`
- Admin auth: `admin@example.com`
- CRM CRUD smoke: enabled (`-RunCrmCrud`)

Results:
- Preflight: passed (3/3)
- Smoke: passed (10/10)

Generated artifacts:
- `artifacts/staging/staging-preflight-20260310-223239.json`
- `artifacts/staging/staging-preflight-latest.json`
- `artifacts/staging/staging-smoke-20260310-223243.json`
- `artifacts/staging/staging-smoke-latest.json`
- `artifacts/staging/STAGING_EVIDENCE_SUMMARY.md`
- `artifacts/staging/RELEASE_EVIDENCE_INDEX.md`
- `artifacts/staging/staging-release-evidence-20260310-223250.zip`
- `artifacts/staging/staging-release-evidence-latest.zip`
