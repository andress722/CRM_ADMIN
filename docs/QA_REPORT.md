# Relatorio QA Consolidado

## Resumo
- Status geral: aprovado com ajustes de build no Next 16 + Sentry.
- Branch: automation/automation-scripts

## Lint
- Go: ok (golangci-lint run ./...)
- Python: ok (uv run ruff check ., uv run ty check copilot)
- Node: ok (npm run format:check, npm run lint, npm run typecheck)
- .NET: ok (dotnet format --verify-no-changes)

## Testes
- Go: ok (go test ./...)
- Python: 97 passed, 2 skipped (uv run pytest -q)
- Node: 61 passed, 2 skipped (npm test)
- .NET: 45 passed, 3 skipped (dotnet test)

## Builds
- Admin frontend: ok (npm run build)
- Storefront: ok (npm run build)

## E2E
- Admin (Playwright): ok (npm run test:e2e)

## Ajustes aplicados
- Adicionado `turbopack: {}` para compatibilidade Next 16 + Sentry em:
  - admin-frontend/next.config.mjs
  - info-tech-gamer-storefront-build/next.config.mjs

## Observacoes
- E2E admin exige frontend rodando em http://localhost:3003.

