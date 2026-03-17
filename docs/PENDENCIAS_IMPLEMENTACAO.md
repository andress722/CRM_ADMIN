# Pendencias de Implementacao

## Data
- 2026-02-25

## Objetivo
Consolidar tudo que falta para fechamento operacional/producao em CRM, loja e admin.

## 1) Evidencias em staging (global)
- [x] Criar automacao de smoke de staging (scripts/staging/run-staging-smoke.ps1) e template de evidencia (docs/STAGING_RELEASE_EVIDENCE.md).
- [ ] Registrar evidencia de execucao em staging (testes + validacoes funcionais). Use `docs/CSP_STAGING_SMOKE.md` para validação de CSP/BFF em browser.
- [x] Evidencia técnica local de CSP/BFF: builds de admin+storefront OK com CSP nonce/allowlist e proxy Next 16 (2026-03-14).
- [x] Evidencia técnica local de testes BFF de segurança (`test:bff-security`) em admin+storefront (2026-03-14).
- [x] Integração no pipeline CI: execução automática de `test:bff-security` para admin + storefront (2026-03-14).
- [x] Pipeline CI publica artefatos dedicados dos testes BFF de segurança (HTML report + test-results) para auditoria (2026-03-14).
- [ ] Anexar evidencias no fluxo de release (artefatos, prints, logs, relatorios).
- [ ] Validar smoke final apos deploy (health, login, CRUD, checkout).

## 2) Hardening de seguranca e operacao (global)
- [x] Confirmar que tokens/secrets nao aparecem em logs (guard de CI + redacao em scripts/servicos).
- [x] Confirmar `Sentry` com PII desabilitado (guard de CI + config de producao).
- [x] Hardening de sessao no navegador: refresh token somente em cookie `HttpOnly`, CSRF duplo-submit em `/auth/refresh` e `/auth/logout`, remoção de `refreshToken` dos payloads de resposta e BFF (`/api/bff/*`) em Admin/Storefront (2026-03-13).
- [x] Limite de payload por grupo de endpoint (auth/payments/webhooks/uploads/default) para reduzir superfície de abuso/exposição (2026-03-13).
- [x] Regras de rate-limit externalizadas para arquivo versionado (`src/Ecommerce.API/rate-limits.json`) e carregadas direto no startup (2026-03-13).
- [x] Remoção de guards locais baseados em token nas páginas do admin; sessão validada via BFF/cookie (2026-03-14).
- [x] Notificações em tempo real no admin sem token em query string de WebSocket (2026-03-14).
- [x] Confirmar dashboards com taxa de erro e latencia (API + frontends). Observacao: dashboard operacional do admin agora expõe taxa de erro, latencia media/p95, backlog de jobs e webhooks via `/api/v1/admin/ops/overview` (2026-03-14).
- [ ] Confirmar alertas minimos (erro 5xx, latencia p95, falha de deploy). Observacao: endpoint de ingestao `POST /api/v1/admin/ops/deploy-signal` + workflow `.github/workflows/deploy-signal.yml` adicionados em 2026-03-15; falta validar sinal real em staging com secrets.
- [ ] Confirmar retry/backoff para conectividade CLI (dependente de modulos SDK fora deste workspace).

## 3) CRM (Admin CRM)
- [x] CRUD de leads/deals/contacts/activities com validacao de payload e erros consistentes.
- [x] Rotas protegidas e fluxo de auth admin funcionando.
- [ ] Evidenciar fluxo completo em staging (listar, criar, editar, excluir, erro de validacao).
- [ ] Cobrir com E2E os fluxos criticos de CRM em staging. Gate local/CI agora inclui `admin-frontend/tests/crm-critical.spec.ts` com artefatos dedicados; falta execução/evidência em staging (2026-03-14).
- [x] Publicar runbook curto de operacao de CRM (falhas comuns e recuperacao). Runbook atualizado com triagem, recovery e referências de smoke/Playwright em `docs/CRM_OPERATIONS_RUNBOOK.md` (2026-03-14).

## 4) Loja (Storefront)
- [x] Implementar recorrencia real com gateway + webhooks (renovacao/falha/cancelamento). Provider HTTP configuravel em `Subscriptions:Billing:*`, processamento de cobranca em lote, webhook HMAC/idempotente e testes de sucesso/falha/cancelamento/webhook (2026-03-14).
  - [x] Hardening inicial do webhook de assinaturas: idempotencia por x-request-id, conflito em reuso de chave com payload diferente e teste automatizado de duplicidade (2026-03-12).
  - [x] Assinatura HMAC no webhook de assinaturas (header `x-signature`, formato configuravel `Subscriptions:Billing:WebhookSignatureFormat`) com compatibilidade ao header legado `x-subscription-webhook-secret` (2026-03-12).
- [x] Implementar busca avancada com engine dedicada (Elastic/Meilisearch) + facetas. `ProductSearchService` suporta provider remoto configuravel com fallback local, facetas e sugestoes no endpoint `/api/v1/products/search` (2026-03-14).
- [x] Hardening mobile (sessao persistente, deep links, push via backend). Backend agora expõe sessão mobile sem cookie em `/api/v1/auth/mobile/login|refresh|logout`, mantém push devices (`/api/v1/push/devices`) e whitelist de deep links (`Mobile:DeepLinks:AllowedSchemes`) com testes automatizados (2026-03-15).
- [ ] Validar jornada ponta-a-ponta em staging (catalogo -> carrinho -> checkout -> webhook). Cobertura integrada local adicionada em `tests/Ecommerce.API.Tests/StorefrontJourneyTests.cs`; falta execução/evidência em staging (2026-03-14).

## 5) Admin (Painel)
- [x] Admin CRUD principal concluido (produtos + CRM).
- [x] CI atualizado para migrations + build de frontends.
- [x] Fechar dashboards operacionais para administracao (erros, latencia, jobs, webhooks). Painel admin consolidado com cards, endpoints observados, backlog de jobs, webhooks e alertas operacionais basicos (2026-03-14).
- [ ] Validar release checklist do painel em staging antes de corte de producao. Smoke agora inclui `GET /api/v1/admin/ops/overview` e o bundle de release agrega evidencias de observabilidade quando presentes (2026-03-14).

## 6) Proxima fase (pos-consolidacao)
- [ ] Observabilidade e seguranca avancada (tracing distribuido, antiabuso por rota).
- [ ] Payouts/automacoes avancadas e robustez de processamento assinc.

## Observacao
- Nao foram encontrados marcadores tecnicos diretos (`TODO/FIXME/NotImplementedException`) no codigo principal (`src`, `admin-frontend`, `info-tech-gamer-storefront-build`).











## 7) Governança de merge
- [x] Workflow dedicado de segurança BFF criado (.github/workflows/bff-security.yml) com checks independentes para Admin e Storefront.
- [ ] Configurar branch protection no repositório exigindo os checks: BFF Security / Admin BFF Security e BFF Security / Storefront BFF Security. Automação adicionada em `.github/workflows/branch-protection.yml` + `scripts/github/set-branch-protection.ps1` (2026-03-15); falta executar com token admin.







