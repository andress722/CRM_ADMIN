#!/usr/bin/env bash
set -euo pipefail

echo "Publish SDKs — dry run unless PUBLISH=true"

DRY_RUN=true
if [ "${PUBLISH:-}" = "true" ] || [ "${PUBLISH:-}" = "1" ]; then
  DRY_RUN=false
fi

echo "DRY_RUN=$DRY_RUN"

# Node.js SDK
if [ -f "nodejs/package.json" ]; then
  echo "-> Node.js SDK"
  (cd nodejs && if $DRY_RUN; then npm publish --dry-run; else npm publish --access public; fi)
fi

# Python SDK (publish to PyPI)
if [ -f "python/setup.py" ] || [ -f "python/pyproject.toml" ]; then
  echo "-> Python SDK"
  (cd python && python -m pip install --upgrade build twine; python -m build; if ! $DRY_RUN; then python -m twine upload dist/*; fi)
fi

# Go: usually uses `go install` or release binaries; leave instructions
if [ -f "go/go.mod" ]; then
  echo "-> Go SDK: create GitHub release and push tags (manual step)"
fi

# .NET (NuGet)
if [ -f "dotnet/src/GitHub.Copilot.SDK.csproj" ]; then
  echo "-> .NET SDK"
  (cd dotnet && dotnet pack -c Release -o ./nupkg; if ! $DRY_RUN; then dotnet nuget push ./nupkg/*.nupkg -k $NUGET_API_KEY -s https://api.nuget.org/v3/index.json; fi)
fi

echo "Publish script complete"
