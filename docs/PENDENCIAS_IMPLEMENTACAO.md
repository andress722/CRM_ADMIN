# Pendencias de Implementacao

## Data
- 2026-02-25

## Objetivo
Consolidar tudo que falta para fechamento operacional/producao em CRM, loja e admin.

## 1) Evidencias em staging (global)
- [x] Criar automacao de smoke de staging (scripts/staging/run-staging-smoke.ps1) e template de evidencia (docs/STAGING_RELEASE_EVIDENCE.md).
- [ ] Registrar evidencia de execucao em staging (testes + validacoes funcionais).
- [ ] Anexar evidencias no fluxo de release (artefatos, prints, logs, relatorios).
- [ ] Validar smoke final apos deploy (health, login, CRUD, checkout).

## 2) Hardening de seguranca e operacao (global)
- [x] Confirmar que tokens/secrets nao aparecem em logs (guard de CI + redacao em scripts/servicos).
- [x] Confirmar `Sentry` com PII desabilitado (guard de CI + config de producao).
- [ ] Confirmar dashboards com taxa de erro e latencia (API + frontends).
- [ ] Confirmar alertas minimos (erro 5xx, latencia p95, falha de deploy).
- [ ] Confirmar retry/backoff para conectividade CLI (dependente de modulos SDK fora deste workspace).

## 3) CRM (Admin CRM)
- [x] CRUD de leads/deals/contacts/activities com validacao de payload e erros consistentes.
- [x] Rotas protegidas e fluxo de auth admin funcionando.
- [ ] Evidenciar fluxo completo em staging (listar, criar, editar, excluir, erro de validacao).
- [ ] Cobrir com E2E os fluxos criticos de CRM em staging.
- [ ] Publicar runbook curto de operacao de CRM (falhas comuns e recuperacao).

## 4) Loja (Storefront)
- [ ] Implementar recorrencia real com gateway + webhooks (renovacao/falha/cancelamento).
- [ ] Implementar busca avancada com engine dedicada (Elastic/Meilisearch) + facetas.
- [ ] Hardening mobile (sessao persistente, deep links, push via backend).
- [ ] Validar jornada ponta-a-ponta em staging (catalogo -> carrinho -> checkout -> webhook).

## 5) Admin (Painel)
- [x] Admin CRUD principal concluido (produtos + CRM).
- [x] CI atualizado para migrations + build de frontends.
- [ ] Fechar dashboards operacionais para administracao (erros, latencia, jobs, webhooks).
- [ ] Validar release checklist do painel em staging antes de corte de producao.

## 6) Proxima fase (pos-consolidacao)
- [ ] Observabilidade e seguranca avancada (tracing distribuido, antiabuso por rota).
- [ ] Payouts/automacoes avancadas e robustez de processamento assinc.

## Observacao
- Nao foram encontrados marcadores tecnicos diretos (`TODO/FIXME/NotImplementedException`) no codigo principal (`src`, `admin-frontend`, `info-tech-gamer-storefront-build`).

