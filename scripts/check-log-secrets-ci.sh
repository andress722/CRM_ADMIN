#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

fail=0

check_pattern() {
  local description="$1"
  local regex="$2"
  shift 2
  local paths=("$@")

  local matches
  matches=$(rg -n -i -S "$regex" "${paths[@]}" || true)
  if [ -n "$matches" ]; then
    echo "[FAIL] $description"
    echo "$matches"
    fail=1
  else
    echo "[OK] $description"
  fi
}

check_pattern \
  "PowerShell scripts must not print token values" \
  'Write-Host\s+".*token\s*:' \
  scripts

check_pattern \
  "PowerShell scripts must not print connection strings" \
  'Write-Host\s+".*connection\s*:' \
  scripts

check_pattern \
  "C# structured logs must not include raw token placeholders" \
  'Log(?:Trace|Debug|Information|Warning|Error|Critical)\s*\(.*\{Token\}' \
  src

check_pattern \
  "Console output must not print raw token values" \
  'Console\.WriteLine\s*\(.*token' \
  src

if [ "$fail" -ne 0 ]; then
  echo "Secret logging guard failed"
  exit 1
fi

echo "Secret logging guard passed"
