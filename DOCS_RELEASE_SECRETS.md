# Release & CI secrets — how to configure repository secrets

This project includes automated release and CI workflows that require repository secrets to publish SDKs and run protected steps.

Add the following secrets in your GitHub repository Settings → Secrets → Actions:

- `NUGET_API_KEY` — API key for NuGet.org (used by `.github/workflows/release.yml`).
- `NPM_TOKEN` — npm token for publishing packages to the npm registry.
- `PYPI_API_TOKEN` — API token for uploading Python packages to PyPI (or use `.pypirc`).
- `GITHUB_TOKEN` — automatically provided by GitHub Actions; `actions/checkout` and other steps use it.

Optional / recommended secrets for integration tests:

- `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` — if you push images as part of CI.
- `AZURE_*` or `AWS_*` — credentials if you deploy in cloud environments or run integration tests against cloud-managed services.

How to add secrets:

1. Go to your repository on GitHub.
2. Click `Settings` → `Secrets and variables` → `Actions` → `New repository secret`.
3. Add the secret name and value, then save.

Triggering a release

- Tag a commit with `v<major>.<minor>.<patch>` (for example `git tag v1.2.0 && git push origin v1.2.0`).
- The `release.yml` workflow triggers on tag pushes and will call `scripts/publish-sdk.sh` with `PUBLISH=true`.

Notes

- `scripts/publish-sdk.sh` performs a dry-run by default. The `release.yml` workflow sets `PUBLISH=true` and expects the required secrets to be present.
- Validate publication locally with the script in dry-run mode before pushing tags.
