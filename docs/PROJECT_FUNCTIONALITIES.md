# Project Functionalities (Backend and Frontend)

Este documento resume todas as areas do repositorio e suas funcionalidades principais. Ele cobre SDKs, admin/CRM, site de vendas, mobile, testes e infraestrutura.

## 1) SDKs Copilot (Backend SDK + CLI)

### Arquitetura base
- SDKs para Node.js, Python, Go e .NET que encapsulam o GitHub Copilot CLI.
- Protocolo JSON-RPC 2.0 entre SDKs e CLI.
- O SDK gerencia o ciclo de vida do processo do CLI (start/stop/force stop) ou conecta a um servidor externo.
- Requer Copilot CLI instalado e acessivel no PATH.

### Capacidades comuns
- Ciclo de vida do cliente: start, stop, force stop, estado de conexao, ping.
- Sessoes: criar, retomar, listar, deletar/destroy, historico de mensagens.
- Mensagens: send, sendAndWait, abort, modos enqueue/immediate.
- Eventos: user/assistant messages, deltas de streaming, tool events, session idle/error.
- Ferramentas: tools customizadas com schema, invocacao e retorno de resultados.
- Anexos: arquivos e imagens (JPG/PNG/GIF) em prompts.
- Streaming: resposta em tempo real (message_delta e reasoning_delta quando suportado).
- Modelos: selecionar modelo por sessao; listar modelos disponiveis quando autenticado.
- BYOK: configuracao de provider/custom endpoint (quando suportado pelo SDK).

### Node.js / TypeScript
- CopilotClient e CopilotSession com eventos.
- Stdio ou TCP; auto-start/auto-restart.
- Tools via JSON schema.

### Python
- API async (async/await), eventos tipados, streaming.
- Stdio ou TCP; auto-start/auto-restart.
- Tools via decorator ou schema direto.

### Go
- Client/Session com handlers de eventos.
- Stdio ou TCP; configuracao de env/cwd.
- Tools via DefineTool ou Tool schema.

### .NET
- CopilotClient/CopilotSession com eventos tipados.
- Stdio ou TCP; opcoes de ambiente e logging.
- Config de tools (available/excluded) e streaming.

### Testes e harness
- E2E dependem do Copilot CLI e do test harness em test/harness.
- Testes de SDK em dotnet/test, go/e2e, python/e2e, nodejs/test.

## 2) Admin Dashboard + CRM (admin-frontend)

Frontend Next.js usado para admin de e-commerce e CRM interno.

### Modulos principais
- Dashboard com KPIs e graficos.
- Produtos (CRUD, filtros, estoque).
- Pedidos (lista, detalhe, status).
- Usuarios/Clientes (lista, status, dados).
- Relatorios e graficos.
- CRM completo: leads, deals, contacts, activities e pipeline.
- Configuracoes administrativas (logs, notificacoes, integracoes, webhooks, banners, profile, settings).

### CRM detalhado
- Entidades: leads, deals, contacts, activities.
- Acoes rapidas: criar atividade, converter lead em deal, email/tarefa.
- Acoes em massa (bulk): update de status/owner/stage/segment/lifecycle/dueDate.
- Pipeline visual com mudanca de etapa e bulk actions.

### Endpoints consumidos (Admin + CRM)
- Estatisticas: /admin/statistics/* (dashboard, sales, top-products, top-categories, revenue).
- Core admin: /admin/overview, /admin/logs, /admin/notifications, /admin/reports, /admin/settings, /admin/integrations, /admin/webhooks, /admin/banners, /admin/profile.
- Produtos: GET/POST /admin/products, PUT/DELETE /admin/products/{id}, PATCH /admin/products/{id}/stock.
- Pedidos: GET /admin/orders, GET /admin/orders/{id}, PATCH /admin/orders/{id}/status.
- Usuarios: GET /admin/customers, GET /admin/customers/{id}.
- CRM: GET/POST /admin/crm/leads|deals|contacts|activities e GET/PUT/PATCH/DELETE por id.

### Arquitetura e UI
- Next.js 14 + TypeScript + Tailwind.
- Componentes centrais: Sidebar, Dashboard, Tables, Charts, Modais.
- Estado via store compartilhada e API client centralizado.
- Documentacao extensa em admin-frontend/DOCUMENTATION_INDEX.md.

### Autenticacao
- Token bearer no header Authorization: Bearer <token>.

## 3) Storefront (site de vendas)

Frontend publico do e-commerce (Next.js), com paginas e fluxos de compra.

### Paginas principais
- Home/catalogo: info-tech-gamer-storefront-build/app/page.tsx.
- PDP: info-tech-gamer-storefront-build/app/product/page.tsx.
- Carrinho: info-tech-gamer-storefront-build/app/cart/page.tsx.
- Checkout: info-tech-gamer-storefront-build/app/checkout/page.tsx.
- Wishlist: info-tech-gamer-storefront-build/app/wishlist/page.tsx.
- Acompanhamento de pedido: info-tech-gamer-storefront-build/app/track-order/page.tsx.
- Conta/Perfil: info-tech-gamer-storefront-build/app/account/page.tsx, app/profile/page.tsx.
- Subscriptions: info-tech-gamer-storefront-build/app/subscriptions/page.tsx.
- Suporte e privacidade: info-tech-gamer-storefront-build/app/support/page.tsx, app/privacy/page.tsx.
- Debug/operacao: info-tech-gamer-storefront-build/app/debug-payment/page.tsx, app/verify-email/page.tsx, app/dashboard/page.tsx.

### Recursos base
- i18n (i18next/react-i18next).
- Busca com fuse.js.
- Testes com jest.

## 4) Mobile

Projeto mobile com Expo (mobile/): app.json, App.tsx, src/.

## 5) Ecommerce backend (base tecnica)

Existe um conjunto de projetos Ecommerce.* (src/Ecommerce.* e pastas Ecommerce.API/Ecommerce.Domain) e documentacao extensa de e-commerce (ECOMMERCE_*.md). A documentacao indica modulos como:
- Auth/2FA, reviews, refunds, shipping, inventory, analytics, compliance, email, webhooks.
- Status e gaps em arquivos como ECOMMERCE_STATUS.md, BACKEND_GAPS.md e PRODUCTION_GAPS.md.

Observacao: este repo e multi-projeto; valide o escopo ativo do backend nos docs de ecommerce e nas soln de src/.

## 6) Infra, scripts e docs

- docker-compose*.yml para ambiente local/teste.
- scripts/ com utilitarios (migrations, dev-start, publish, simulate refresh, sql/).
- docs/ com planos, roadmap, observabilidade, lacunas e prox passos.
- cookbook/ com receitas por linguagem.

## Referencias

- README principal: README.md
- Getting Started: docs/getting-started.md
- Admin docs: admin-frontend/README.md, admin-frontend/DOCUMENTATION_INDEX.md
- CRM API: admin-frontend/CRM_API.md
- CRM smoke test: admin-frontend/CRM_SMOKE_TEST.md
- Storefront: info-tech-gamer-storefront-build/README.md

