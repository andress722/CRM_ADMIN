$ErrorActionPreference = "Stop"

$alertsFile = "docs/observability/alert-rules.prometheus.yml"
$runbookFile = "docs/observability/INCIDENT_RUNBOOK.md"

$requiredAlerts = @(
  "EcommerceApiHigh5xxRate",
  "EcommerceApiHighP95Latency",
  "MercadoPagoWebhook5xxSpike",
  "EventWorkerHealthEndpointUnavailable"
)

if (-not (Test-Path $alertsFile)) {
  throw "missing alerts file: $alertsFile"
}

if (-not (Test-Path $runbookFile)) {
  throw "missing runbook file: $runbookFile"
}

$alertsContent = Get-Content -Raw $alertsFile
foreach ($alert in $requiredAlerts) {
  if ($alertsContent -notmatch [regex]::Escape("alert: $alert")) {
    throw "required alert '$alert' not found in $alertsFile"
  }
}

$runbookContent = Get-Content -Raw $runbookFile
if ($runbookContent -notmatch "Primary owner:") {
  throw "runbook does not define primary owner"
}

if ($runbookContent -notmatch "Incident channels:") {
  throw "runbook does not define incident channels"
}

if ($runbookContent -notmatch "Staging validation checklist") {
  throw "runbook does not include staging validation checklist"
}

Write-Host "OK: observability guard checks passed."
