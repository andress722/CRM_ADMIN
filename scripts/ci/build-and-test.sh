#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> Running CI build-and-test script"

# .NET projects
if [ -d "dotnet" ]; then
  echo "-- .NET: restore, format check, build & test"
  (
    cd dotnet
    dotnet restore
    dotnet format src/GitHub.Copilot.SDK.csproj --verify-no-changes
    dotnet build -v minimal
    dotnet test -v minimal
  )
fi

# Node.js projects
for d in nodejs storefront admin-frontend mobile; do
  if [ -f "$d/package.json" ]; then
    echo "-- Node: $d install, lint, build & test"
    (
      cd "$d"
      npm ci
      npm run lint --if-present
      npm run typecheck --if-present
      npm run build --if-present
      npm test --if-present
    )
  fi
done

# Go
if [ -f "go/go.mod" ]; then
  echo "-- Go: running golangci-lint & go test ./..."
  (cd go && golangci-lint run ./... && go test ./...)
fi

# Python
if [ -f "python/pyproject.toml" ] || [ -f "python/setup.py" ]; then
  echo "-- Python: install dev deps, lint & test"
  (
    cd python
    python -m pip install -e ".[dev]"
    ruff check .
    ty check copilot
    pytest -q
  )
fi

echo "==> CI script finished"
