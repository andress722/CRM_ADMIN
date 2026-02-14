# Checklist de Integração e Observabilidade do Projeto Copilot SDK

Este documento serve como guia prático para garantir que todos os componentes do projeto estejam integrados, observáveis, seguros e prontos para produção.

## 1. SDKs e Integração Copilot
- [x] SDKs multi-linguagem (Node.js, Python, Go, .NET) implementados e testados.
- [x] Integração com Copilot CLI via JSON-RPC.
- [x] Testes unitários e E2E para todos SDKs.
- [x] **Exemplo de uso real em cada linguagem**
  - Adicionar exemplos práticos (cookbook) para Node.js, Python, Go e .NET.
  - Observacao: READMEs das pastas de cookbook mencionam scaffold; validar conteudo dos recipes.
- [ ] **Documentação de integração para clientes externos**
  - Guia de integração e melhores práticas para uso do SDK.
  - Observacao: existe guia geral e READMEs dos SDKs, mas nao um guia dedicado para clientes externos.

## 2. Observabilidade e Segurança
- [ ] **Logging estruturado e telemetria nos SDKs**
  - Implementar hooks/callbacks para logs, métricas de uso e tracing.
  - Observacao: nao foram encontrados hooks/telemetria nos SDKs.
- [ ] **Sanitização de logs e tratamento de dados sensíveis**
  - Garantir que informações sensíveis não sejam logadas.
  - Observacao: nao ha documentacao ou implementacao explicita.
- [ ] **Documentação de práticas seguras para uso do SDK**
  - Orientações para clientes sobre segurança.
  - Observacao: faltam guias especificos de boas praticas de seguranca.
- [ ] **Integração com sistemas de monitoramento externos**
  - Exemplos de integração com Sentry, Datadog, Application Insights.
  - Observacao: nao ha exemplos nos SDKs.

## 3. Resiliência e Robustez
- [ ] **Retry/backoff para falhas de comunicação com o CLI**
  - Implementar lógica de repetição e backoff exponencial.
  - Observacao: ha retry/backoff pontual no SDK Node, mas nao padronizado para falhas com o CLI.
- [x] **Timeout configurável para chamadas RPC**
  - Presente nos SDKs (Go/Python/Node) com defaults e parâmetros de timeout.
- [ ] **Fallback/graceful degradation se o CLI estiver indisponível**
  - Mensagens de erro amigáveis e documentação.
  - Observacao: ha mensagens de erro, mas falta guia dedicado e comportamento uniforme.
- [ ] **Testes de stress/performance**
  - Scripts e cenários automatizados.

## 4. Backend/API (Ecommerce/API)
- [x] Persistência real (Postgres, EF Core, Docker).
- [x] Migrations e seed automatizados.
- [x] Push device registration (mobile → backend).
- [x] **Observabilidade: logs estruturados, métricas Prometheus, tracing OpenTelemetry**
  - Serilog + métricas Prometheus + bootstrap OpenTelemetry no `Program.cs`.
- [ ] **Monitoramento de erros (ex: Sentry)**
  - Integrar Sentry para captura de exceções.
  - Observacao: nao foi encontrada integracao ativa no runtime da API.
- [x] **Segurança: CORS, headers, JWT, rate limiting**
  - CORS, headers de segurança, JWT e rate limiting configurados no `Program.cs`.

## 5. Mobile (React Native/Expo)
- [x] Registro de push token e integração com backend.
- [x] Deep linking configurado.
- [x] Persistência de sessão.
- [ ] **Telemetria/crash reporting (ex: Sentry, Expo Application Services)**
  - Integrar Sentry ou EAS para monitoramento de erros.
- [ ] **Testes de integração push notification end-to-end**
  - Validar envio e recebimento de push.

## 6. Storefront/Admin Frontend
- [ ] **Integração completa com backend**
  - Garantir que todos os fluxos e rotas estejam cobertos.
  - Observacao: README do admin lista endpoints, mas cobertura completa nao esta comprovada.
- [ ] **Tratamento de erros e feedback ao usuário**
  - Mensagens claras e logs de erro.
  - Observacao: ha feedbacks pontuais, mas sem padrao documentado.
- [ ] **Observabilidade básica (ex: logs de erro, Sentry)**
  - Integrar Sentry ou similar.
  - Observacao: nao ha integracao de Sentry no frontend.
- [x] **Testes automatizados (Jest, Cypress, etc)**
  - Storefront usa Jest; admin-frontend possui e2e com Playwright.

## 7. DevOps/Distribuição
- [ ] **Scripts de build, lint, test e deploy automatizados**
  - Automatizar pipelines para todos SDKs e apps.
  - Observacao: CI atual roda build/test, mas nao inclui lint/deploy para todos os apps.
- [x] **Publicação automatizada dos SDKs (npm, PyPI, NuGet, etc)**
  - Script `scripts/publish-sdk.sh` (dry-run por padrão).
- [x] **Checagem de compatibilidade de versão com o CLI**
  - Script `scripts/check-compatibility.sh`.

### Ações implementadas (início)

- **Workflow CI:** Adicionado `/.github/workflows/ci.yml` que executa um script de CI para construir e testar os componentes.
- **Script CI unificado:** `scripts/ci/build-and-test.sh` — restaura e executa testes para `dotnet`, `nodejs`, `go`, `python`, `storefront`, `admin-frontend` e `mobile` quando aplicável.
- **Script de publicação:** `scripts/publish-sdk.sh` — empacota e publica (npm, PyPI, NuGet) em modo dry-run por padrão; defina `PUBLISH=true` e variáveis de credenciais (`NUGET_API_KEY`, `NPM_TOKEN`, `PYPI` creds) para publicar.
- **Script de compatibilidade:** `scripts/check-compatibility.sh` — verificação básica da versão em `sdk-protocol-version.json` vs arquivos SDK.
- **Execução local completa (13/02/2026):** lint + tests (Go/Python/Node/.NET) e checks do admin-frontend (lint, e2e, build) concluídos com sucesso.
- **Revisao ampla (14/02/2026):** status dos documentos alinhado com ROADMAP/PRODUCTION_GAPS e gaps registrados nas observacoes acima.

### Como usar localmente

1. Executar CI localmente (simula o workflow):

```bash
chmod +x ./scripts/ci/build-and-test.sh
./scripts/ci/build-and-test.sh
```

2. Rodar checagem de compatibilidade:

```bash
chmod +x ./scripts/check-compatibility.sh
./scripts/check-compatibility.sh
```

3. Publicação (dry-run por padrão):

```bash
chmod +x ./scripts/publish-sdk.sh
./scripts/publish-sdk.sh

# Para publicar de fato (configure tokens nas variáveis de ambiente):
PUBLISH=true NUGET_API_KEY="$NUGET_API_KEY" ./scripts/publish-sdk.sh
```

### Próximos passos recomendados

- Adicionar secrets no repositório (`NUGET_API_KEY`, `NPM_TOKEN`, `PYPI_API_TOKEN`) e um workflow de `release` para publicar em tags.
- Adicionar caching e paralelização no workflow CI (dependendo do tempo de execução).
- Criar job de integração que levanta containers (Postgres) e executa E2E contra ambiente real.


---

## Como usar este checklist
- Marque cada item concluído conforme for implementando.
- Use as seções detalhadas para priorizar e dividir tarefas.
- Atualize este arquivo conforme o projeto evoluir.

---

Se desejar, podemos detalhar o plano de ação para cada item prioritário.