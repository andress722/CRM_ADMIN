# Incident Runbook (API + Workers)

## Scope
- API HTTP availability and error-rate incidents.
- Mercado Pago webhook delivery failures.
- Background worker degradation (`EventWorker` / `WebhookDeliveryWorker`).

## Ownership and channels
- Primary owner: Backend On-call.
- Secondary owner: DevOps On-call.
- Product communication: Tech Lead.
- Incident channels:
  - Slack: `#incidents-ecommerce`
  - Slack: `#backend-alerts`
  - Ticketing: `INC-*` in incident board

## Alert mapping
- `EcommerceApiHigh5xxRate`: backend on-call investigates API regressions.
- `EcommerceApiHighP95Latency`: backend + devops investigate saturation and slow dependencies.
- `MercadoPagoWebhook5xxSpike`: backend investigates payment webhook pipeline and secrets/signature.
- `EventWorkerHealthEndpointUnavailable`: backend validates worker loop + infrastructure runtime.

## First 15 minutes checklist
1. Acknowledge alert in `#incidents-ecommerce` and open incident ticket.
2. Confirm blast radius: check `/health`, `/metrics`, and Sentry errors.
3. Validate latest deploy and config changes (`render.yaml`, API env vars, secrets rotation).
4. If payment impact exists, check `/api/webhooks/mercadopago` logs and signature failures.
5. If worker impact exists, inspect logs for:
   - `EventWorker encountered an error`
   - `Webhook delivery cycle failed`
6. Apply rollback or feature toggle if customer impact is ongoing.

## Diagnostic commands
```bash
# API health
curl -sS https://<api-host>/health

# Metrics snapshot
curl -sS https://<api-host>/metrics

# Last deploy metadata (adjust to platform tooling)
# render services list / deployment logs
```

## Recovery actions by symptom
- High 5xx:
  - rollback latest deploy if correlated.
  - disable risky provider path via env/config if safe fallback exists.
- High latency:
  - verify DB latency/connection saturation.
  - reduce traffic burst via rate limiting and cache checks.
- Webhook failures:
  - verify `Payments__MercadoPago__WebhookSecret` and signature format.
  - confirm upstream Mercado Pago webhook retries and endpoint availability.
- Worker failures:
  - inspect dead-letter growth and pending event backlog.
  - restart service only after root-cause hypothesis is recorded.

## Resolution and postmortem
1. Confirm alert clear for at least 15 minutes.
2. Post customer-facing summary if needed.
3. Record root cause, impact window, and corrective actions.
4. Open follow-up tasks for automation/tests/alert tuning.

## Staging validation checklist (required before closing S3-04)
- Trigger synthetic 5xx and verify `EcommerceApiHigh5xxRate` alert path.
- Add latency injection and verify `EcommerceApiHighP95Latency` alert path.
- Simulate webhook signature failure and verify webhook alert.
- Simulate worker exception and verify worker-health alert and runbook flow.

## Automation helper
- Script: `scripts/observability/run-staging-observability-check.ps1`
- Evidence template: `docs/observability/STAGING_EVIDENCE_TEMPLATE.md`

Example:
```powershell
pwsh -File scripts/observability/run-staging-observability-check.ps1 `
  -ApiBaseUrl "https://copilot-sdk-api-staging.onrender.com" `
  -AdminBearerToken "<ADMIN_JWT>"
```
