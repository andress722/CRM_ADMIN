# Checklist de Produção e Go-To-Market

## Objetivo
Avaliar se o sistema está pronto para venda, com foco em risco operacional, modelo comercial e expansão para marketplaces.

## Status executivo (2026-03-16)
- **Pode vender para piloto pago?** Sim, com escopo controlado e SLA limitado.
- **Pode vender em escala/produção plena?** Ainda não.
- **Bloqueadores atuais:** evidência final em staging, alertas live validados em ambiente real e branch protection efetivamente aplicada.

## 1) Checklist de produção (go-live)

### 1.1 Gate técnico local (já validado)
- [x] Build backend e testes API passando.
- [x] Build admin frontend passando.
- [x] Fluxos críticos de segurança BFF cobertos por teste.
- [x] Fluxos críticos de CRM cobertos por Playwright local.
- [x] Sessão mobile persistente sem cookie implementada (`/api/v1/auth/mobile/*`).

### 1.2 Gate de staging (obrigatório antes de venda em escala)
- [x] Rodar smoke de staging e anexar artifacts (`staging-smoke`, `STAGING_EVIDENCE_SUMMARY`, `RELEASE_EVIDENCE_INDEX`).
- [x] Validar login admin, CRM CRUD e overview operacional com token admin.
- [ ] Validar jornada storefront ponta-a-ponta (`catalog -> cart -> checkout -> webhook`).
- [ ] Executar checklist CSP/BFF em browser e anexar evidências.

### 1.3 Observabilidade e operação (obrigatório)
- [x] Ativar secrets de staging para deploy signal (`STAGING_API_URL`, `STAGING_DEPLOY_SIGNAL_SECRET`).
- [ ] Validar ingestão real de falha/sucesso de deploy em `/api/v1/admin/ops/deploy-signal`.
- [ ] Confirmar alertas live de 5xx e p95 no stack de monitoramento.
- [ ] Incluir runbook de incidente e rollback no release.

### 1.4 Governança de merge (obrigatório)
- [ ] Executar workflow de branch protection com token admin (`BRANCH_PROTECTION_GH_TOKEN`).
- [ ] Confirmar checks obrigatórios no branch principal:
  - `Admin BFF Security`
  - `Storefront BFF Security`

## 2) Posicionamento comercial: vender Admin/Storefront separadamente

## É possível? Sim.
Modelo recomendado: **gerenciador de ofertas + licenças por módulo**.

### Opções de produto
- **Pacote A (Storefront Only):** catálogo, carrinho, checkout, auth do cliente, pagamentos.
- **Pacote B (Admin Only):** CRM, gestão de produtos, relatórios, operações.
- **Pacote C (Full Suite):** Admin + Storefront com integração completa.

### Como implementar o gerenciador
- [ ] Criar serviço/licença por cliente (`tenant_id`, `plan`, `features`).
- [ ] Feature flags por módulo (ex.: `features.admin`, `features.storefront`).
- [ ] Provisionamento por domínio/ambiente do cliente.
- [ ] Limites por plano (usuários admin, volume pedidos, integrações).
- [ ] Billing/assinatura por cliente (mensal/anual).

## 3) Subir produtos direto para Mercado Livre

## É possível? Sim, tecnicamente viável.
**Hoje o projeto já integra Mercado Pago (pagamentos), mas não há integração pronta de publicação de catálogo no Mercado Livre.**

### Escopo recomendado de integração Mercado Livre
- [ ] Conector OAuth de vendedor Mercado Livre (token por seller).
- [ ] Mapeamento de produto local -> item Mercado Livre (título, descrição, preço, estoque, imagens, atributos obrigatórios por categoria).
- [ ] Publicação de item via API ML (create/update/pause/close).
- [ ] Persistir vínculo `product_id <-> ml_item_id`.
- [ ] Sync de estoque/preço bidirecional (job + retries + DLQ).
- [ ] Importar status/erros de publicação para painel admin.
- [ ] Webhooks ML para atualização de pedidos/status.

### Riscos e cuidados
- [ ] Tratar variações por categoria (atributos obrigatórios mudam).
- [ ] Rate limit e backoff por seller/account.
- [ ] Estratégia de idempotência para evitar item duplicado.
- [ ] Política de media/imagem conforme requisitos ML.

## 4) Recomendação prática
- Venda imediata recomendada: **piloto pago com 1-3 clientes**, sem prometer SLA enterprise.
- Antes de escalar vendas: fechar todos os itens da seção 1.2, 1.3 e 1.4.
- Para monetização modular: iniciar pelo pacote **Storefront Only** e evoluir para Full Suite com licenciamento.


## Execução automatizada (gate único)

Comando padrão (local):

```powershell
pwsh -File scripts/release/run-production-readiness.ps1
```

Com staging e observabilidade:

```powershell
pwsh -File scripts/release/run-production-readiness.ps1 \
  -RunStagingSmoke \
  -RunObservabilityCheck \
  -ApiBaseUrl "https://api-staging..." \
  -AdminBaseUrl "https://admin-staging..." \
  -StorefrontBaseUrl "https://storefront-staging..." \
  -AdminEmail "admin@..." \
  -AdminPassword "..." \
  -AdminBearerToken "..."
```

Para aplicar branch protection (não apenas dry-run):

```powershell
$env:GH_TOKEN="<token admin repo>"
pwsh -File scripts/release/run-production-readiness.ps1 -ApplyBranchProtection
```

