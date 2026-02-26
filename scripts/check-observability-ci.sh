#!/usr/bin/env bash
set -euo pipefail

ALERTS_FILE="docs/observability/alert-rules.prometheus.yml"
RUNBOOK_FILE="docs/observability/INCIDENT_RUNBOOK.md"

required_alerts=(
  "EcommerceApiHigh5xxRate"
  "EcommerceApiHighP95Latency"
  "MercadoPagoWebhook5xxSpike"
  "EventWorkerHealthEndpointUnavailable"
)

if [ ! -f "$ALERTS_FILE" ]; then
  echo "ERROR: missing alerts file: $ALERTS_FILE"
  exit 1
fi

if [ ! -f "$RUNBOOK_FILE" ]; then
  echo "ERROR: missing runbook file: $RUNBOOK_FILE"
  exit 1
fi

for alert in "${required_alerts[@]}"; do
  if ! grep -q "alert: $alert" "$ALERTS_FILE"; then
    echo "ERROR: required alert '$alert' not found in $ALERTS_FILE"
    exit 1
  fi
done

if ! grep -q "Primary owner:" "$RUNBOOK_FILE"; then
  echo "ERROR: runbook does not define primary owner"
  exit 1
fi

if ! grep -q "Incident channels:" "$RUNBOOK_FILE"; then
  echo "ERROR: runbook does not define incident channels"
  exit 1
fi

if ! grep -q "Staging validation checklist" "$RUNBOOK_FILE"; then
  echo "ERROR: runbook does not include staging validation checklist"
  exit 1
fi

echo "OK: observability guard checks passed."
