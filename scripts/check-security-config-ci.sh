#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="src/Ecommerce.API/appsettings.Production.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "WARN: $CONFIG_FILE not found - skipping security config guard (assume OK)."
  exit 0
fi

if ! grep -q '"SendDefaultPii"\s*:\s*false' "$CONFIG_FILE"; then
  echo "ERROR: Sentry SendDefaultPii must be false in production config ($CONFIG_FILE)."
  exit 1
fi

if grep -q '"EnableOpenTelemetry"\s*:\s*true' "$CONFIG_FILE"; then
  echo "ERROR: OpenTelemetry must be disabled by default in production config ($CONFIG_FILE)."
  exit 1
fi

echo "OK: production security config guard passed."
