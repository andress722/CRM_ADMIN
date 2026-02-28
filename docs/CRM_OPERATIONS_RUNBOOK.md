# CRM Operations Runbook

## Scope
Operational guide for CRM module (leads, deals, contacts, activities) in admin panel.

## Ownership
- Primary owner: Backend on-call
- Secondary owner: Admin frontend on-call
- Channel: `#incidents-ecommerce`

## Common incidents and actions

### 1) CRM list endpoints return 401/403
- Verify admin JWT is valid and not expired.
- Confirm role claim is `Admin`.
- Check auth middleware and CORS headers in API.
- Validate `Jwt__Issuer`, `Jwt__Audience`, and `Jwt__SecretKey` are consistent.

### 2) CRM create/update returns 4xx
- Inspect payload contract in `CrmController` request DTOs.
- Validate required fields in request body and date formats.
- Reproduce via API call against staging and capture response body.

### 3) CRM create/update returns 5xx
- Check API logs with correlation id.
- Confirm DB migrations are applied and CRM tables exist.
- Validate DB connectivity and pool saturation.

### 4) CRM delete succeeds but UI still shows stale item
- Force refresh list endpoint and clear client cache/state.
- Verify optimistic UI reconciliation in admin frontend.
- Check if API returned 204 and entity no longer exists on GET by id.

## Staging validation checklist
- [ ] GET `/api/v1/admin/crm/leads` -> 200
- [ ] POST `/api/v1/admin/crm/leads` -> 200
- [ ] PATCH `/api/v1/admin/crm/leads/{id}` -> 200
- [ ] DELETE `/api/v1/admin/crm/leads/{id}` -> 204
- [ ] Invalid payload returns 4xx (documented)

## Recovery flow
1. Acknowledge incident and open ticket `INC-*`.
2. Capture failing request + correlation id.
3. Mitigate:
   - rollback recent deploy/config change, or
   - disable affected UI action via feature flag/message.
4. Validate fix in staging with smoke (`-RunCrmCrud`).
5. Close incident with root cause and follow-up task.

## Useful references
- `scripts/staging/run-staging-smoke.ps1`
- `docs/STAGING_RELEASE_EVIDENCE.md`
- `docs/ADMIN_RELEASE_CHECKLIST.md`
- `docs/observability/INCIDENT_RUNBOOK.md`
