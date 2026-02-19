# Plano Detalhado de Implementação Pendente

## Estado atual (fevereiro/2026)
- Backend de autenticação já está mais seguro (refresh em cookie HttpOnly + CSRF double-submit + forwarded headers).
- Painéis legados em `admin-frontend/components` já migraram para cliente HTTP centralizado.
- Páginas App Router (`admin-frontend/app`) já usam helper centralizado de autenticação (`authFetch`) sem montagem manual de header de token.

## Prioridade P0 (segurança e consistência)
1. Unificar cliente HTTP no `admin-frontend/app`
- Escopo: substituir `fetch` manual + `AuthService.getToken()` repetido por `ApiClient`/helper único.
- Status: concluído.
- Critério de aceite:
  - [x] Nenhuma chamada autenticada em `app/` constrói header `Authorization` manualmente.
  - [x] CSRF enviado automaticamente em requests sensíveis.
  - [x] Refresh/retry centralizado sem duplicação por página.

2. Padronizar tratamento de erro na UI
- Escopo: remover `.catch(() => setLoading(false))` silencioso e exibir estado de erro acionável.
- Critério de aceite:
  - cada tela de dados possui `loading`, `error`, `empty` explícitos.
  - logs de erro não vazam detalhes sensíveis para usuário final.

## Prioridade P1 (funcionalidades ainda simuladas)
1. Substituir ações "simuladas" por endpoints reais
- Arquivos alvo:
  - `admin-frontend/components/AdvancedSettingsPanel.tsx`
  - `admin-frontend/components/CouponsPanel.tsx`
  - `admin-frontend/components/ReviewsPanel.tsx`
  - `admin-frontend/components/UserRolesPanel.tsx`
  - `admin-frontend/components/AbandonedCartPanel.tsx`
- Critério de aceite:
  - botões executam persistência real no backend.
  - sucesso/erro com feedback visual.
  - estado local sincroniza com retorno da API.

2. Completar worker de eventos no backend
- Arquivo alvo: `src/Ecommerce.Infrastructure/BackgroundServices/EventWorker.cs`
- Gap atual: TODO para inventário/notificações.
- Critério de aceite:
  - evento consumido gera efeito observável (estoque e/ou notificação).
  - cobertura de teste de integração para fluxo feliz e falha transitória.

## Prioridade P2 (qualidade e governança)
1. Testes de frontend para auth/CSRF
- Cobrir fluxo com cookie de refresh e header CSRF.
- Critério de aceite: testes automatizados passam em CI sem `|| true`.

2. Warnings zero no build .NET
- Status: concluído no build local.
- Critério de aceite:
  - [x] `dotnet build src/Ecommerce.sln --no-restore -v minimal` sem warnings.

3. Gates de CI
- Adicionar etapa obrigatória de typecheck frontend (`npx tsc --noEmit`) separada do build.
- Critério de aceite: PR falha com erro de tipo antes de deploy.

## Contorno operacional (dotnet/rede)
1. Usar `NuGet.config` do repositório em restore (já preparado).
2. Em rede corporativa/proxy:
- configurar proxy via `scripts/dotnet/set-proxy.ps1`.
- diagnosticar via `scripts/dotnet/nuget-diagnose.ps1`.
- recuperar cache/fontes via `scripts/dotnet/nuget-recover.ps1`.
3. Em falha `NU1301`:
- validar conectividade para `api.nuget.org:443`.
- se bloqueado, ajustar firewall/proxy ou espelho interno de pacotes.

## Ordem recomendada de execução
1. P0.1
2. P0.2
3. P1.1
4. P1.2
5. P2.1
6. P2.2
7. P2.3
