# Pendencias Restantes

Data: 2026-03-07

## Itens pendentes

- [x] Criar endpoint backend para template de e-mail administrativo.
  - Objetivo: remover dependencia de `localStorage` no `AdvancedSettingsPanel`.
  - Sugestao de contrato:
    - `GET /api/v1/admin/email-template`
    - `PUT /api/v1/admin/email-template`
  - Persistencia: tabela/config administrativa (ex.: `AdminSettings` ou entidade dedicada).

- [x] Remover alias de compatibilidade `LEGACY_API_URL`.
  - Arquivo atual: `admin-frontend/src/services/endpoints.ts`
  - Acao: manter apenas `ADMIN_API_URL` e atualizar qualquer import remanescente.
  - Criterio de pronto: nenhum uso de `LEGACY_API_URL` no frontend.

## Observacao

- Build atual do frontend e API esta verde apos as ultimas mudancas.

