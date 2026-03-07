# Backlog de Desmock e Integracao Real (Site Completo)

Data de levantamento: 2026-03-06  
Escopo: `info-tech-gamer-storefront-build/`, `admin-frontend/`, `src/Ecommerce.API/`, `src/Ecommerce.Application/`, `src/Ecommerce.Infrastructure/`

## Resumo Executivo

- Estado atual: grande parte dos fluxos principais ja chama API real, mas ainda existem pontos criticos com comportamento mock/stub/parcial.
- Maiores riscos de producao:
  - Plano de assinaturas no storefront chama endpoint inexistente.
  - Gestao de imagens de produto no admin usa armazenamento em memoria e URL fake.
  - Integracoes externas ainda possuem respostas de fallback/simulacao em casos sem configuracao.

## Checklist Completo (O que falta desmockar/integrar)

## 1) Storefront (Cliente)

- [x] Remover ou proteger rota de debug de pagamento em producao (`info-tech-gamer-storefront-build/app/debug-payment/page.tsx`)
- [x] Eliminar base mock legada nao utilizada (`info-tech-gamer-storefront-build/lib/mock-data.ts`)
- [x] Integrar renderizacao de imagem real no catalogo/PDP/carrinho/wishlist (hoje usa placeholders visuais sem carregar `imageUrl`)
  - `info-tech-gamer-storefront-build/components/product-card.tsx`
  - `info-tech-gamer-storefront-build/app/product/page.tsx`
  - `info-tech-gamer-storefront-build/app/cart/page.tsx`
  - `info-tech-gamer-storefront-build/app/wishlist/page.tsx`
- [x] Corrigir fluxo de assinaturas: frontend chama `/subscriptions/plans`, mas API nao expoe esse endpoint
  - chamada: `info-tech-gamer-storefront-build/lib/api.ts`
  - controller atual sem rota de planos: `src/Ecommerce.API/Controllers/SubscriptionsController.cs`

## 2) Admin Frontend

- [x] Substituir fallback de email hardcoded no header (`admin@example.com`) por estado real de sessao
  - `admin-frontend/components/Header.tsx`
- [x] Fechar fluxo real de upload/gestao de imagens de produto (frontend ja chama endpoint, mas backend ainda simula URL)
  - tela: `admin-frontend/app/admin/products/[id]/page.tsx`

## 3) API Backend

- [x] Implementar persistencia real de imagens de produto (S3/Blob/local persistente) e metadados em banco
  - hoje em memoria: `src/Ecommerce.API/Controllers/AdminController.cs` (`_productImages` + URL gerada)
- [x] Expor endpoint real de planos de assinatura (`GET /api/v1/subscriptions/plans`) e alinhar contrato com storefront
  - `src/Ecommerce.API/Controllers/SubscriptionsController.cs`
  - `src/Ecommerce.Application/Services/SubscriptionService.cs`
- [x] Evoluir assinaturas para recorrencia real (cobranca, retentativa, falha, cancelamento por webhook)
  - hoje `SubscriptionService` ainda faz ciclo simplificado sem gateway de recorrencia
- [x] Transformar teste de integracao em verificacao real (hoje sempre sucesso)
  - `src/Ecommerce.API/Controllers/AdminExtrasController.cs` (`POST integrations/{id}/test`)
- [x] Persistir estado de leitura de notificacoes (hoje HashSet em memoria, perde ao reiniciar)
  - `src/Ecommerce.API/Controllers/AdminExtrasController.cs` (`_readNotifications`)
- [x] Remover/encerrar endpoints legados com listas estaticas para evitar uso acidental
  - `src/Ecommerce.API/Controllers/LegacyAdminController.cs`

## 4) Integracoes Externas (Pagamentos, Email, Frete)

- [x] Garantir configuracao obrigatoria de email transacional em producao (evitar fallback para `ConsoleEmailService`)
  - `src/Ecommerce.API/Program.cs`
- [x] Garantir observabilidade/alerta quando shipping provider cair em fallback de cotacao padrao
  - fallback atual: `src/Ecommerce.Infrastructure/Shipping/CorreiosShippingProvider.cs` (`DefaultQuotes()`)
- [x] Revisar fallback de criacao de remessa para tracking sintetico quando provider nao responde
  - `src/Ecommerce.Application/Services/ShippingService.cs` (gera `TRK-...`)
- [x] Manter protecao contra pagamento stub fora de desenvolvimento e validar por ambiente
  - `src/Ecommerce.API/Program.cs`
  - `src/Ecommerce.Infrastructure/Payments/StubPaymentGateway.cs`

## Backlog Priorizado

## P0 (Bloqueia operacao/valor de negocio)

1. Implementar endpoint `GET /subscriptions/plans` + contrato real de planos.
2. Finalizar integracao real de imagens de produto (upload + persistencia + consumo storefront/admin).
3. Remover/proteger `debug-payment` em producao.
4. Substituir respostas fake de teste de integracao por verificacao real de conectividade.

## P1 (Confiabilidade operacional)

1. Persistencia de estado de notificacoes admin.
2. Hardening de email provider para impedir fallback silencioso em producao.
3. Instrumentacao e alertas para fallback de frete/tracking sintetico.
4. Desativacao formal dos endpoints legados `/api/*` do `LegacyAdminController`.

## P2 (Qualidade e limpeza)

1. Remover `mock-data.ts` e artefatos de mock mortos.
2. Remover fallback hardcoded `admin@example.com` no frontend.
3. Melhorar exibicao de imagem real em todas as vitrines do storefront.

## Criterios de Aceite (Definition of Done)

- [x] Assinaturas: storefront carrega planos reais sem erro 404 e cria assinatura com resposta consistente.
- [x] Imagens: admin faz upload real, URL persiste apos restart e storefront exibe imagem real.
- [x] Integracoes: endpoint de teste falha/sucesso conforme conectividade real, com mensagem diagnostica.
- [x] Notificacoes: status de leitura persiste em banco.
- [x] Email/frete: quando provider externo falhar, evento aparece em log estruturado + alerta.
- [x] Zero rota de debug/mock exposta em producao.

## Plano de Execucao Sugerido

## Sprint 1 (P0)

1. Assinaturas: `plans` + contrato + ajuste frontend.
2. Imagens de produto: storage provider + entidade/tabela + endpoints upload/list.
3. Bloqueio de rota debug em build de producao.
4. Integrations test real (timeout, status, erro).

## Sprint 2 (P1)

1. Persistencia de notificacoes.
2. Guard-rails de configuracao de email/frete (startup validation + healthchecks).
3. Descomissionar legado `/api/abandoned-carts` e `/api/reviews`.

## Sprint 3 (P2)

1. Cleanup de mocks mortos e fallbacks visuais.
2. Polimento UX de imagens e estados vazios.





