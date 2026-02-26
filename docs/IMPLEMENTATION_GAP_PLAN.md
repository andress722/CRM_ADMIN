# Plano de Implementacao de Gaps

## Data de atualizacao
- 22/02/2026

## Objetivo
- Consolidar os gaps de frontend e backend em um board de execucao com status, dono, esforco e criterio de aceite.

## Estado atual resumido
- Build e lint dos frontends passam.
- Testes backend passam (24/24).
- Ainda ha gaps de producao em autenticacao de rotas no admin, desmock no storefront, hardening de backend e cobertura de testes.

## Board (Kanban)

### Colunas
- `Todo`: item ainda nao iniciado.
- `In Progress`: item em desenvolvimento.
- `Done`: item finalizado e validado.

### Sprint 1 (critico: seguranca e confiabilidade)

| ID | Item | Dono | Responsavel nominal | Esforco | Status |
|---|---|---|---|---|---|
| S1-01 | Corrigir auth/guards do admin frontend | Frontend | Benyamin | 3-5 dias | Done |
| S1-02 | Reativar gate de type safety no storefront | Frontend | Benyamin | 0.5-1 dia | Done |
| S1-03 | Reativar monitoramento de erros no admin (Sentry) | Frontend | Benyamin | 1-2 dias | Done |
| S1-04 | Endurecer inicializacao de providers no backend | Backend | Benyamin | 1-2 dias | Done |

### Sprint 2 (robustez funcional e desmock)

| ID | Item | Dono | Responsavel nominal | Esforco | Status |
|---|---|---|---|---|---|
| S2-01 | Remover mocks ativos do storefront | Frontend | Benyamin | 3-4 dias | Done |
| S2-02 | Completar processamento do EventWorker | Backend | Benyamin | 3-5 dias | Done |
| S2-03 | Fortalecer validacao de payload nos endpoints CRM | Backend | Benyamin | 2-3 dias | Done |
| S2-04 | Definir politica explicita para recomendacoes | Tech Lead + Backend | Benyamin | 0.5-1 dia | Done |

### Sprint 3 (qualidade continua e governanca)

| ID | Item | Dono | Responsavel nominal | Esforco | Status |
|---|---|---|---|---|---|
| S3-01 | Expandir E2E do admin para fluxos criticos | Frontend + QA | Benyamin | 3-4 dias | Done |
| S3-02 | Adicionar suite de testes para storefront | Frontend + QA | Benyamin | 2-4 dias | Done |
| S3-03 | Expandir testes backend em modulos sensiveis | Backend + QA | Benyamin | 3-5 dias | Done |
| S3-04 | Fechar alertas operacionais de observabilidade | DevOps + Backend + Frontend | Benyamin | 2-3 dias | Done |

## Cards do board

### S1-01 - Corrigir auth/guards do admin frontend
- Arquivos principais:
  - `admin-frontend/src/middleware.ts`
  - `admin-frontend/src/services/auth.ts`
- Escopo:
  - alinhar estrategia de sessao entre middleware e cliente.
  - proteger rotas privadas alem de `/admin`.
  - padronizar fluxo de login/logout/expiracao.
- Checklist:
  - [x] middleware e auth usam a mesma fonte de verdade de sessao.
  - [x] rotas privadas nao carregam sem sessao valida.
  - [x] logout remove sessao e redireciona corretamente.
- Criterio de aceite:
  - usuario sem sessao nao acessa rotas privadas.

### S1-02 - Reativar gate de type safety no storefront
- Arquivo principal:
  - `info-tech-gamer-storefront-build/next.config.mjs`
- Escopo:
  - remover bypass de erro de tipo no build.
  - corrigir erros de tipagem existentes.
- Checklist:
  - [x] remover `ignoreBuildErrors: true`.
  - [x] `npm run build` falha quando houver erro de tipo.
  - [x] `npm run typecheck` permanece verde.
- Criterio de aceite:
  - build de producao bloqueia regressao de tipos.

### S1-03 - Reativar monitoramento de erros no admin (Sentry)
- Arquivo principal:
  - `admin-frontend/sentry.client.config.ts`
- Escopo:
  - habilitar Sentry client/server/edge por ambiente.
  - ajustar amostragem e politica de PII.
- Checklist:
  - [x] DSN configurado por ambiente.
  - [x] captura de erro validada em staging.
  - [x] PII e payload sensivel filtrados.
- Criterio de aceite:
  - erro de teste visivel no Sentry de staging.

### S1-04 - Endurecer inicializacao de providers no backend
- Arquivo principal:
  - `src/Ecommerce.API/Program.cs`
- Escopo:
  - impedir fallback silencioso para `Stub` (pagamentos) e `Console` (email) em producao.
  - falhar startup com mensagem explicita quando configuracao obrigatoria faltar.
- Checklist:
  - [x] producao nao sobe sem provider valido de pagamento.
  - [x] producao nao sobe sem provider valido de email.
  - [x] documentacao de env obrigatoria atualizada.
- Criterio de aceite:
  - `Production` falha cedo em caso de configuracao invalida.

### S2-01 - Remover mocks ativos do storefront
- Arquivos principais:
  - `info-tech-gamer-storefront-build/app/subscriptions/page.tsx`
  - `info-tech-gamer-storefront-build/components/search-filters.tsx`
  - `info-tech-gamer-storefront-build/lib/mock-data.ts`
- Escopo:
  - carregar planos e filtros a partir da API.
  - remover dependencia de dados mock em runtime.
- Checklist:
  - [x] subscriptions renderiza dados reais.
  - [x] filtros de busca nao dependem de `mock-data`.
  - [x] fallback de erro/empty state implementado.
- Criterio de aceite:
  - fluxo integral com dados do backend.

### S2-02 - Completar processamento do EventWorker
- Arquivo principal:
  - `src/Ecommerce.Infrastructure/BackgroundServices/EventWorker.cs`
- Escopo:
  - implementar efeitos de `PurchaseCompleted` (estoque e notificacoes).
  - garantir retry e idempotencia.
- Checklist:
  - [x] evento atualiza estoque corretamente.
  - [x] notificacoes/webhooks executam sem duplicidade.
  - [x] falha transitoria e reprocessada com politica definida.
- Criterio de aceite:
  - evento gera efeito observavel e auditavel sem duplicacao.

### S2-03 - Fortalecer validacao de payload nos endpoints CRM
- Arquivo principal:
  - `src/Ecommerce.API/Controllers/CrmController.cs`
- Escopo:
  - aplicar validacoes de formato, limites e obrigatoriedade.
  - padronizar resposta de erro 400 para o frontend.
- Checklist:
  - [x] requests invalidas retornam erro consistente.
  - [x] campos criticos possuem validacao de dominio.
  - [x] contratos documentados para front.
- Criterio de aceite:
  - payload invalido nao persiste dado inconsistente.

### S2-04 - Definir politica explicita para recomendacoes
- Arquivo principal:
  - `src/Ecommerce.API/Controllers/RecommendationsController.cs`
- Escopo:
  - decidir se endpoint e publico ou autenticado.
  - aplicar atributo explicito e cobrir teste de autorizacao.
- Checklist:
  - [x] politica de acesso definida.
  - [x] atributo de autorizacao explicito aplicado.
  - [x] teste de acesso atualizado.
- Criterio de aceite:
  - endpoint segue politica de seguranca documentada.

### S3-01 - Expandir E2E do admin para fluxos criticos
- Arquivo base:
  - `admin-frontend/tests/e2e.spec.ts`
- Escopo:
  - cobrir login, refresh, logout, CRUD CRM e cenarios de permissao.
- Checklist:
  - [x] suite cobre autenticacao ponta a ponta.
  - [x] suite cobre CRUD principal de CRM.
  - [x] suite roda em CI com resultado deterministico.
- Criterio de aceite:
  - regressao critica barrada antes de deploy.

### S3-02 - Adicionar suite de testes para storefront
- Escopo:
  - incluir smoke e integracao para carrinho, checkout, perfil e subscriptions.
- Checklist:
  - [x] ao menos 1 teste por fluxo critico.
  - [x] execucao integrada no pipeline.
  - [ ] evidencia de execucao em staging.
- Criterio de aceite:
  - falhas basicas de jornada de compra quebram CI.

### S3-03 - Expandir testes backend em modulos sensiveis
- Pasta principal:
  - `tests/Ecommerce.API.Tests`
- Escopo:
  - cobrir CRM, worker de eventos, auth edge cases e retry/idempotencia.
- Checklist:
  - [x] cenarios de erro e permissao cobertos.
  - [x] cenarios de reprocessamento cobertos.
  - [x] testes confiaveis sem dependencia fragil de ambiente.
- Criterio de aceite:
  - cobertura pratica dos caminhos de maior risco operacional.

### S3-04 - Fechar alertas operacionais de observabilidade
- Escopo:
  - alertas para 5xx, latencia, falha de webhook e falha de worker.
  - runbook de resposta a incidente.
- Checklist:
  - [x] alertas configurados e testados em staging.
  - [x] runbook disponivel no repositorio.
  - [x] responsaveis e canais definidos.
- Criterio de aceite:
  - incidente simulado gera alerta acionavel.

## Dependencias e bloqueadores
- Secrets e variaveis de ambiente de producao precisam estar provisionados.
- Ambientes de staging e CI devem suportar execucao dos novos testes E2E.

## Ordem recomendada de execucao
1. Sprint 1 completo.
2. Sprint 2 itens 1 e 2.
3. Sprint 2 itens 3 e 4.
4. Sprint 3 completo.


















