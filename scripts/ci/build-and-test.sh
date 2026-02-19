#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> Running CI build-and-test script"

# .NET projects
if [ -f "src/Ecommerce.sln" ]; then
  echo "-- .NET: restore, build & test"
  dotnet restore src/Ecommerce.sln --configfile NuGet.config -m:1 /p:RestoreDisableParallel=true
  dotnet build src/Ecommerce.sln -v minimal --no-restore
  dotnet test tests/Ecommerce.API.Tests/Ecommerce.API.Tests.csproj -v minimal --no-build
fi

# Node.js projects
for d in info-tech-gamer-storefront-build admin-frontend; do
  if [ -f "$d/package.json" ]; then
    echo "-- Node: $d install, lint, build & test"
    (
      cd "$d"
      if [ -f "pnpm-lock.yaml" ]; then
        corepack enable >/dev/null 2>&1 || true
        pnpm install --frozen-lockfile
        pnpm run lint --if-present
        pnpm run typecheck --if-present
        pnpm run build --if-present
        pnpm test --if-present
      elif [ -f "package-lock.json" ]; then
        npm ci
        npm run lint --if-present
        npm run typecheck --if-present
        npm run build --if-present
        npm test --if-present
      else
        npm install
        npm run lint --if-present
        npm run typecheck --if-present
        npm run build --if-present
        npm test --if-present
      fi
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
