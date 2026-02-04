# Plano de Automação — CRM Admin (Resumo e Ações)

Este documento descreve gaps detectados, prioridades e propostas de automação para finalizar o projeto CRM Admin, tests e observability.

## Objetivo
- Tornar fácil para um desenvolvedor iniciar o ambiente localmente (Postgres + API + frontends).
- Automatizar migrações/seed no CI e proteger configurações sensíveis (OTEL).
- Garantir E2E estável com Playwright e coleta de artefatos em falhas.

## Gaps Principais (resumo)
- Falta `docker-compose.dev.yml` para orquestrar Postgres (host:5433), API e frontends.
- CI não aplica migrações/seed antes de testes.
- Playwright E2E depende de portas instáveis (3000 conflita -> usamos 3003 em dev).
- OpenTelemetry: pacote com advisory; precisa mitigação e policy em CI para não habilitar em produção inadvertidamente.
- Admin UI: faltam polimentos finais (validação, acessibilidade, mensagens e paginação).

## Prioridades imediatas
1. CI: aplicar migrações e seed antes do build/test.
2. CI: orquestrar API + frontend (usar porta estável, ex: `3003`) e executar Playwright E2E; coletar logs/screenshots/trace.
3. Dev: adicionar `docker-compose.dev.yml` para integração local.
4. Segurança: adicionar verificação que impede `Observability:EnableOpenTelemetry=true` em produção no CI.

## Snippets e exemplos

### 1) `docker-compose.dev.yml` (sugestão)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: ecommerce
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: ./src/Ecommerce.API
    env_file: .env.api
    depends_on:
      - postgres
    ports:
      - "5071:5071"
    command: dotnet run --urls "http://0.0.0.0:5071"

  admin-frontend:
    build: ./admin-frontend
    env_file: admin-frontend/.env.local
    ports:
      - "3003:3003"
    command: sh -c "npm run build && node node_modules/next/dist/bin/next start -p 3003"

volumes:
  postgres_data:
```

Obs: este `docker-compose` é um ponto de partida — em Windows/PowerShell ajuste `command` conforme necessário.

### 2) Startup script para aplicar migrações (PowerShell)

```powershell
cd src\Ecommerce.Infrastructure
dotnet ef database update --startup-project "..\Ecommerce.API\Ecommerce.API.csproj" --connection "Host=postgres;Port=5432;Database=ecommerce;Username=admin;Password=changeme;SslMode=Disable;"
```

Use essa etapa em CI antes de rodar testes.

### 3) GitHub Actions: job mínimo para migrations + build + E2E

```yaml
name: CI
on: [push, pull_request]
jobs:
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: admin
          POSTGRES_PASSWORD: changeme
          POSTGRES_DB: ecommerce
        ports: [5433:5432]
        options: >-
          --health-cmd "pg_isready -U admin -d ecommerce" --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '9.0.x'
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Restore and run migrations
        run: |
          cd src/Ecommerce.Infrastructure
          dotnet restore
          dotnet ef database update --startup-project "..\Ecommerce.API\Ecommerce.API.csproj" --connection "Host=localhost;Port=5433;Database=ecommerce;Username=admin;Password=changeme;SslMode=Disable;"

      - name: Build backend
        run: |
          cd src/Ecommerce.API
          dotnet build --no-restore

      - name: Build admin frontend
        run: |
          cd admin-frontend
          npm ci
          npm run build

      - name: Start services and run E2E
        run: |
          # Start API in background
          cd src/Ecommerce.API
          dotnet run --urls "http://localhost:5071" &
          sleep 5
          # Start frontend on 3003
          cd ../../admin-frontend
          node node_modules/next/dist/bin/next start -p 3003 &
          sleep 5
          # Install Playwright browsers and run tests
          npx playwright install --with-deps
          npm run test:e2e
```

Notas: esse job é condensado — ajustar timeouts e coleta de artefatos (screenshots/traces) conforme necessário.

### 4) CI check para OpenTelemetry em produção

Adicionar um job que valida `appsettings.Production.json` (ou variáveis de ambiente) e falha quando `Observability:EnableOpenTelemetry` for `true`.

Exemplo (bash):

```bash
if grep -q '"EnableOpenTelemetry"\s*:\s*true' src/Ecommerce.API/appsettings.Production.json; then
  echo "ERROR: OpenTelemetry enabled in production config. Disable or confirm mitigation."; exit 1
fi
```

## E2E estabilidade
- Use porta configurável via variável `FRONTEND_PORT` nos testes.
- Aguarde health endpoint da API (`/health`) antes de iniciar os testes.
- Colete `playwright` artefatos com `--reporter=html` e arquive no job.

## Observability / Segurança
- Não habilitar OpenTelemetry em produção por padrão.
- Centralizar `OtlpEndpoint` via variables/secret e exigir revisão para habilitar.
- Habilitar Dependabot para pacotes NuGet e NPM e configurar alertas de segurança.

## Runbook rápido (dev)
1. Start Docker compose:

```powershell
docker compose -f docker-compose.dev.yml up --build
```

2. Se preferir rodar local sem Docker:
- Aplicar migrations (veja script acima).
- `dotnet run` no `src/Ecommerce.API` (porta 5071).
- `npm run build` e start do admin em `3003` (ou `npm run dev` em modo dev).

## Próximos passos que eu posso executar
- Gerar `docker-compose.dev.yml` real no repo e um `justfile`/scripts para facilitação.
- Implementar o job de CI (arquivo `.github/workflows/ci-integration.yml`).
- Adicionar job que valida `appsettings.Production.json` e bloqueia OTEL em produção.

---
Arquivo gerado automaticamente. Se quiser, aplico os arquivos de exemplo (`docker-compose.dev.yml` e a workflow) agora.

## Arquivos adicionados
- `docker-compose.dev.yml` — orquestra Postgres (5433), API (5071) e admin frontend (3003) para desenvolvimento.
- `scripts/apply-migrations.ps1` — script PowerShell para aplicar migrations contra o serviço Postgres do compose.
- `scripts/check-otel-ci.sh` — script que falha no CI se `Observability:EnableOpenTelemetry` estiver habilitado no `appsettings.Production.json`.
- `.github/workflows/ci-integration.yml` — workflow de integração (migrations, build, start e Playwright E2E).

Use `docker compose -f docker-compose.dev.yml up --build` para iniciar localmente. Se precisar, posso testar comandos locais ou ajustar portas/variáveis.
