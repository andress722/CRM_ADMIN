#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Checking SDK protocol version compatibility"

if [ ! -f sdk-protocol-version.json ]; then
  echo "sdk-protocol-version.json not found"; exit 1
fi

ROOT_VER=$(jq -r '.version' sdk-protocol-version.json)
echo "root protocol version: $ROOT_VER"

check_file() {
  local file="$1"
  if [ -f "$file" ]; then
    # Try to extract a semver-like value from common patterns per language
    v=$(grep -Eo "[0-9]+\.[0-9]+\.[0-9]+" "$file" | head -n1 || true)
    if [ -z "$v" ]; then
      # fallback: look for version = "x.y.z" or const VERSION = "x.y.z"
      v=$(grep -Eo "[Vv]ersion\W*[:=]\W*\"[0-9]+\.[0-9]+\.[0-9]+\"" "$file" | grep -Eo "[0-9]+\.[0-9]+\.[0-9]+" | head -n1 || true)
    fi
    echo "  $file -> ${v:-<none>}"
    if [ -n "$v" ] && [ "$v" != "$ROOT_VER" ]; then
      echo "    -> MISMATCH with root version"
      return 1
    fi
  fi
}

exit_code=0
check_file nodejs/src/sdkProtocolVersion.ts || exit_code=1
check_file dotnet/src/SdkProtocolVersion.cs || exit_code=1
check_file go/sdk_protocol_version.go || exit_code=1
check_file python/copilot/sdk_protocol_version.py || exit_code=1

if [ $exit_code -eq 0 ]; then
  echo "Compatibility check passed"
else
  echo "Compatibility check found mismatches"
fi
exit $exit_code
