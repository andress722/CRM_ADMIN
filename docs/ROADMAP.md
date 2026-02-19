**Resumo**
- **Objetivo:** desmockar frontends, habilitar observabilidade, aplicar migrações, e entregar um Admin UI completo para CRM (leads, deals, contacts, activities) + storefront.
- **Estado atual:** migrações de CRM aplicadas no DB dev (Postgres em host:5433). Admin UI moderno em `admin-frontend` e storefront ajustado para SSR. Docker compose de teste disponível.

**Pré-requisitos locais**
- **Docker Desktop** rodando (containers e volumes gerenciados por `docker compose`).
- Backend: .NET 9 SDK instalado; comandos `dotnet` e `dotnet ef` disponíveis.
- Node: `npm` disponível para frontends (`admin-frontend`, `info-tech-gamer-storefront-build`).

**Arquivos importantes**
- API config: [src/Ecommerce.API/appsettings.Development.json](src/Ecommerce.API/appsettings.Development.json)
- DbContext / Migrations: [src/Ecommerce.Infrastructure](src/Ecommerce.Infrastructure)
- Admin UI: [admin-frontend](admin-frontend)
- Storefront: [storefront](info-tech-gamer-storefront-build)

**Roadmap Priorizado (curto prazo → longo prazo)**
- **Infra / Migrations (Alta):** garantir que migrations rodem no CI e em dev; automatizar `dotnet ef database update` ou aplicar via startup. (arquivo: [docker-compose.test.yml](docker-compose.test.yml))
- **Backend - API & Segurança (Alta):** completar validação/DTOs, adicionar autorização RBAC nas rotas de CRM e endpoints de health.
- **Admin UI - CRUD Completo (Alta):** implementar edição, exclusão, validação, mensagens de erro e paginação/filtragem; proteger rotas com auth client-side.
- **Storefront - Desmock (Alta):** apontar chamadas para `NEXT_PUBLIC_API_URL`, remover mocks e validar SSR `apiFetch`.
- **Observability (Média):** integrar OpenTelemetry (traces + metrics) e Serilog/Exporter (OTLP/Sentry/Seq). Incluir correlação de request id.
- **CI / Testes (Média):** pipeline para build/test, aplicar migrações em ambiente de teste, e e2e que exercitem CRM CRUD.
- **E2E & Contract Tests (Média):** criar testes que validem contrato API ↔ frontends.
- **Docs & Runbook (Baixa):** `docs/development.md`, `.env.local.example`, instruções de troubleshooting.

**Tarefas imediatas (executáveis agora)**
- Iniciar backend (Development) e confirmar health + endpoints:

```powershell
cd "src\Ecommerce.API"
dotnet run --project Ecommerce.API.csproj
``` 

- Rodar admin dev server (porta 3000):

```powershell
cd "admin-frontend"
npm install
npm run dev
``` 

- Rodar storefront dev server (se necessário, porta 3006):

```powershell
cd "info-tech-gamer-storefront-build"
npm install
npm run dev
``` 

- Aplicar migrações manualmente (caso precise reaplicar):

```powershell
cd "src\Ecommerce.Infrastructure"
dotnet ef database update --startup-project "..\Ecommerce.API\Ecommerce.API.csproj"
```

**Variáveis de ambiente (exemplo)**

Coloque um arquivo `.env.local` na raiz do frontend com a variável abaixo para apontar o frontend ao backend local:

```env
NEXT_PUBLIC_API_URL=http://localhost:5071
```

Se o frontend estiver rodando em outra porta (por ex. `3003`), atualize o valor para `http://localhost:3003`.

**Ferramenta de teste de segurança**
- `scripts/simulate-refresh-reuse.ps1`: PowerShell script que automatiza o fluxo de login -> refresh (rotação) -> replay do token antigo para disparar a detecção de reutilização de refresh token. Útil para validar a nova proteção.

**OpenTelemetry advisory (important)**
The project currently references `OpenTelemetry.Instrumentation.AspNetCore`. A NuGet advisory (GHSA-vh2m-22xx-q94f) affects some versions.

Mitigation recommendations:
- Default to disabling OpenTelemetry in production by setting `Observability:EnableOpenTelemetry=false` in production `appsettings` or environment variables.
- Use the `Observability:OtlpEndpoint` only in controlled environments and ensure sampling and PII scrubbing is configured.
- Track OpenTelemetry package releases and upgrade to a patched version when available; do **not** enable full instrumentation in production until vulnerability is addressed.

Example (development):
```json
{
	"Observability": {
		"EnableOpenTelemetry": true,
		"OtlpEndpoint": ""
	}
}
```

**Checklist curto prazo (7 dias)**
- [ ] Rodar backend + seed em dev automaticamente.  
- [ ] Completar Admin CRUD (edit/delete + validation).  
- [ ] Proteger rotas admin e validar auth flow (JWT).  
- [ ] Integrar traces básicos OpenTelemetry (dev mode).  
- [ ] Atualizar CI para rodar migrations e build dos frontends.

**Risks & notas**
- Se o volume do Postgres for reutilizado, variáveis `POSTGRES_PASSWORD` não são reaplicadas — use recriação de volume para reset.  
- Habilitar tracing em produção requer cuidado com dados sensíveis (PII) e amostragem.

**Como eu posso ajudar agora**
- A: Iniciar o backend e validar endpoints (posso executar aqui).  
- B: Implementar edição/exclusão no Admin UI e adicionar validação (eu implemento).  
- C: Acrescentar integração OpenTelemetry segura no `Program.cs` (eu implemento um bootstrap).  

Escolha A, B ou C para eu começar a executar um passo concreto e eu continuo a partir daqui.

Roadmap gerado em: 2026-01-31

