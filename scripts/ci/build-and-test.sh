#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> Running CI build-and-test script"

# .NET projects
if [ -d "dotnet" ]; then
  echo "-- .NET: restore & test"
  (cd dotnet && dotnet restore && dotnet test -v minimal)
fi

# Node.js projects
for d in nodejs storefront admin-frontend mobile; do
  if [ -f "$d/package.json" ]; then
    echo "-- Node: $d install & test"
    (cd "$d" && npm ci && npm test)
  fi
done

# Go
if [ -f "go/go.mod" ]; then
  echo "-- Go: running go test ./..."
  (cd go && go test ./...)
fi

# Python
if [ -f "python/pyproject.toml" ] || [ -f "python/setup.py" ]; then
  echo "-- Python: running pytest"
  (cd python && python -m pip install -r test-requirements.txt || true; pytest -q)
fi

echo "==> CI script finished"
