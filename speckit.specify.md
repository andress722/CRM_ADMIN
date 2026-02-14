Crie a SPEC de um e-commerce completo (“Loja de Produtos”) com foco em segurança, confiabilidade e pagamentos.

Stack obrigatória:

- Backend: ASP.NET Core 8 Web API (C#)
- Banco: PostgreSQL (EF Core)
- Frontend: Next.js + TypeScript

Requisitos essenciais:

A) Autenticação & Segurança (ROBUSTO)

1. Cadastro e Login com:
   - verificação obrigatória de e-mail (token com expiração + reenvio)
   - reset de senha via e-mail
   - refresh token com rotação e revogação
   - sessões por dispositivo (listar e encerrar sessões)
   - políticas de senha fortes
   - lockout e rate limit em login/reset
2. Proteções:
   - validações server-side
   - logs de auditoria (login, reset, alterações administrativas)
   - API com versionamento e respostas padronizadas de erro

B) Catálogo, Categorias e Busca Interativa

1. Categorias (hierarquia opcional)
2. Produtos com:
   - múltiplas imagens
   - estoque, preço, descrição, tags
   - variações opcionais (tamanho/cor) se necessário
3. Busca interativa:
   - dropdown de sugestões (produtos + categorias)
   - filtros por categoria e faixa de preço
   - ordenação (relevância, menor/maior preço)

C) Carrinho “à prova de falhas”

1. Carrinho persistente e confiável:
   - carrinho do convidado (guest) e do usuário logado
   - merge automático ao logar
   - persistência server-side com controle de concorrência
   - validação de estoque a cada alteração
2. Idempotência:
   - evitar duplicar operações em caso de retry/reload
3. Snapshot:
   - no checkout, capturar snapshot de preço/nome no pedido

D) Promoções e Cupons

1. Admin define promoções:
   - percentual/fixo, por produto ou categoria
   - validade (start/end), prioridade e regra de exclusão/combinação
2. Cupons:
   - código, tipo desconto, min order, validade
   - limite total e por usuário
   - tracking de uso e prevenção de abuso

E) Pedidos e Pagamentos

1. Pedido:
   - status (CREATED, PENDING_PAYMENT, PAID, FAILED, CANCELED, SHIPPED)
   - itens com snapshot e total calculado
2. Pagamentos (com abstração por provider):
   - Mercado Pago
   - PayPal
   - InfinitePay
3. Webhooks:
   - atualização automática do status do pedido
   - idempotência e tolerância a eventos duplicados

Critérios de aceite:

- Usuário só compra após e-mail verificado.
- Carrinho não perde itens em refresh/erro e não duplica operações.
- Admin cria produto/categoria, ativa promoções, cria cupons e acompanha pedidos.
- Pagamento inicia e status do pedido atualiza via webhook.
