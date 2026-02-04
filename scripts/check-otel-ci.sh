#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="src/Ecommerce.API/appsettings.Production.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "WARN: $CONFIG_FILE not found — skipping OTEL guard (assume OK)."
  exit 0
fi

if grep -q '"EnableOpenTelemetry"\s*:\s*true' "$CONFIG_FILE"; then
  echo "ERROR: OpenTelemetry enabled in production config ($CONFIG_FILE). Disable or confirm mitigation before allowing CI to proceed."
  exit 1
fi

echo "OK: OpenTelemetry disabled in production config."
