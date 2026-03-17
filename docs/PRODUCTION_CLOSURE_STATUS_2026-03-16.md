# Fechamento de Produção - Status Atual

Data: 2026-03-16

## Evidência automática
- Relatório JSON: `artifacts/readiness/production-readiness-latest.json`
- Script de gate único: `scripts/release/run-production-readiness.ps1`

## Concluído agora (automatizado)
- [x] Build da solução .NET
- [x] Testes de API (`tests/Ecommerce.API.Tests`)
- [x] Build do admin frontend
- [x] Testes Playwright de segurança BFF (admin)
- [x] Testes Playwright CRM crítico (admin)
- [x] Smoke real em staging com login admin + CRM + overview operacional
- [x] Observabilidade em staging com bearer admin (evidência em `artifacts/observability`)
- [x] Branch protection em dry-run (validação de payload/contextos)

## Concluído anteriormente (código pronto)
- [x] Endpoint de sinal de deploy: `POST /api/v1/admin/ops/deploy-signal`
- [x] Workflow para enviar sinal de deploy: `.github/workflows/deploy-signal.yml`
- [x] Workflow para aplicar branch protection: `.github/workflows/branch-protection.yml`
- [x] Sessão mobile sem cookie: `/api/v1/auth/mobile/login|refresh|logout`

## Ainda depende de ambiente externo (não fechável só com código local)
- [ ] Configurar secrets no GitHub Actions (se ainda não estiverem definidos):
  - `STAGING_API_URL`
  - `STAGING_ADMIN_URL`
  - `STAGING_STOREFRONT_URL`
  - `STAGING_ADMIN_EMAIL`
  - `STAGING_ADMIN_PASSWORD`
  - `STAGING_DEPLOY_SIGNAL_SECRET`
  - `BRANCH_PROTECTION_GH_TOKEN`
- [ ] Executar branch protection com token admin (modo apply).
- [ ] Validar alertas live no monitoramento (5xx, p95, deploy failure) após tráfego/sinais reais.

## Comando único para fechar o restante
```powershell
$env:GH_TOKEN="<token admin repo>"
pwsh -File scripts/release/run-production-readiness.ps1 \
  -RunStagingSmoke \
  -RunObservabilityCheck \
  -ApplyBranchProtection \
  -ApiBaseUrl "https://crm-admin-8alt.onrender.com" \
  -AdminBaseUrl "https://app.infotechgamer.site" \
  -StorefrontBaseUrl "https://app.infotechgamer.site" \
  -AdminEmail "admin@example.com" \
  -AdminPassword "demo123"
```
