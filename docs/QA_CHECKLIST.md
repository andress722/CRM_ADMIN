# Checklist de QA/Testes

## Testes Automatizados
- Rodar testes por SDK:
  - Node: `npm test`
  - Python: `uv run pytest`
  - Go: `go test ./...`
  - .NET: `dotnet test test/GitHub.Copilot.SDK.Test.csproj`

## Lint/Format
- Go: `golangci-lint run ./...`
- Python: `uv run ruff check .` e `uv run ty check copilot`
- Node: `npm run format:check`, `npm run lint`, `npm run typecheck`
- .NET: `dotnet format src/GitHub.Copilot.SDK.csproj --verify-no-changes`

## Builds
- Admin: `npm run build` (admin-frontend)
- Storefront: `npm run build` (info-tech-gamer-storefront-build)

## E2E
- Instalar Playwright: `npx playwright install --with-deps`
- Rodar E2E admin: `npm run test:e2e` (admin-frontend)

## Smoke Tests Manuais
- Login funciona
- Dashboard carrega
- Listagem de pedidos e paginas principais
- Checkout basico no storefront

## Verificacoes Gerais
- Sem erros de TypeScript
- Sem warnings de PII nos logs
- `GET /health` e `GET /metrics` respondem

