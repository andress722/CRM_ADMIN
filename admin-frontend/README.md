# E-Commerce Admin Dashboard

Dashboard administrativo completo para gerenciar seu e-commerce.

Status real: em consolidacao; ver docs/ROADMAP.md e docs/PRODUCTION_GAPS.md.

## 🚀 Features

- 📊 Dashboard com estatísticas em tempo real
- 📦 Gerenciamento de produtos (CRUD)
- 🛒 Gerenciamento de pedidos
- 👥 Gerenciamento de usuários
- 📈 Gráficos e relatórios de vendas
- 🤝 CRM completo (leads, deals, contatos, atividades, pipeline)
- 📱 Interface responsiva
- 🎨 Design moderno com Tailwind CSS

## 🛠️ Tecnologias

- **Next.js 16** - Framework React
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilização
- **Recharts** - Gráficos
- **Zustand** - State management
- **Axios** - HTTP client
- **ExcelJS** - Exportação de planilhas
- **Chart.js** - Gráficos avançados
- **Zod** - Validação de dados
- **Lucide React** - Icons

## 📦 Instalação

```bash
npm install
```

## 🏃 Rodar em desenvolvimento

```bash
npm run dev
```

Acesse em `http://localhost:3000`

## 🔧 Variáveis de Ambiente

Crie um arquivo `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5071
```

> Observação: todas as rotas admin são montadas a partir de `/admin/*`.

## 📋 Funcionalidades

### Dashboard
- Visualização de KPIs principais
- Resumo de pedidos recentes
- Status de pedidos

### Produtos
- Listar todos os produtos
- Criar novo produto
- Editar produto existente
- Deletar produto
- Filtrar por nome ou categoria

### Pedidos
- Listar todos os pedidos
- Atualizar status do pedido
- Visualizar detalhes dos itens
- Filtrar por status

### Usuários
- Listar todos os usuários
- Visualizar status de verificação de email
- Informações de cadastro

### Relatórios
- Gráfico de top 10 produtos
- Distribuição por categorias (Pie chart)
- Receita por produto (Bar chart)

### CRM
- Leads, negócios (deals), contatos e atividades
- Pipeline visual com movimentação de estágio
- Ações rápidas e ações em massa (bulk)
- Detalhes com edição e exclusão

## 🔌 API Endpoints Utilizados

**Estatísticas:**
- GET `/admin/statistics/dashboard` - Dashboard stats
- GET `/admin/statistics/sales` - Sales statistics
- GET `/admin/statistics/top-products` - Top selling products
- GET `/admin/statistics/top-categories` - Top categories
- GET `/admin/statistics/revenue` - Revenue stats

**Admin core:**
- GET `/admin/overview`
- GET `/admin/logs`
- GET `/admin/notifications`
- GET `/admin/reports`
- GET `/admin/settings`
- GET `/admin/integrations`
- GET `/admin/webhooks`
- GET `/admin/banners`
- GET `/admin/profile`

**Produtos:**
- GET `/admin/products` - Listar todos
- POST `/admin/products` - Criar
- PUT `/admin/products/{id}` - Atualizar
- DELETE `/admin/products/{id}` - Deletar
- PATCH `/admin/products/{id}/stock` - Atualizar estoque

**Pedidos:**
- GET `/admin/orders` - Listar todos
- GET `/admin/orders/{id}` - Detalhes
- PATCH `/admin/orders/{id}/status` - Atualizar status

**Usuários:**
- GET `/admin/customers` - Listar clientes
- GET `/admin/customers/{id}` - Detalhes

**CRM:**
- GET `/admin/crm/leads` | POST `/admin/crm/leads`
- GET `/admin/crm/leads/{id}` | PUT `/admin/crm/leads/{id}` | PATCH `/admin/crm/leads/{id}` | DELETE `/admin/crm/leads/{id}`
- GET `/admin/crm/deals` | POST `/admin/crm/deals`
- GET `/admin/crm/deals/{id}` | PUT `/admin/crm/deals/{id}` | PATCH `/admin/crm/deals/{id}` | DELETE `/admin/crm/deals/{id}`
- GET `/admin/crm/contacts` | POST `/admin/crm/contacts`
- GET `/admin/crm/contacts/{id}` | PUT `/admin/crm/contacts/{id}` | PATCH `/admin/crm/contacts/{id}` | DELETE `/admin/crm/contacts/{id}`
- GET `/admin/crm/activities` | POST `/admin/crm/activities`
- GET `/admin/crm/activities/{id}` | PUT `/admin/crm/activities/{id}` | PATCH `/admin/crm/activities/{id}` | DELETE `/admin/crm/activities/{id}`

> Para payloads e campos esperados do CRM, veja `CRM_API.md`.

## 📚 Estrutura do Projeto

```
admin-frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│   └── crm/
│       ├── leads/
│       ├── deals/
│       ├── contacts/
│       └── activities/
├── components/
│   ├── Sidebar.tsx
│   ├── Dashboard.tsx
│   ├── ProductsTable.tsx
│   ├── ProductModal.tsx
│   ├── OrdersTable.tsx
│   ├── UsersTable.tsx
│   └── Charts.tsx
├── src/
│   ├── services/
│   │   ├── auth.ts
│   │   └── endpoints.ts
│   └── hooks/
│       └── useAuth.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.mjs
```

## 🎨 Componentes Principais

- **Sidebar** - Navegação lateral com tabs
- **Dashboard** - Página inicial com KPIs
- **ProductsTable** - Tabela de produtos com filtro
- **ProductModal** - Modal para criar/editar produtos
- **OrdersTable** - Tabela de pedidos expansível
- **UsersTable** - Tabela de usuários
- **Charts** - Gráficos com Recharts

## 🔐 Autenticação

Autenticação via token bearer usando `AuthService` (`src/services/auth.ts`).
As páginas consomem `AuthService.getToken()` e enviam o header:

```
Authorization: Bearer <token>
```

Se o token não existir, a UI exibe erro de autenticação.

## 📖 Desenvolvimento

Para adicionar novos componentes:

1. Crie o componente em `components/`
2. Importe em `app/page.tsx`
3. Adicione a lógica necessária
4. Teste em desenvolvimento

## 🚀 Build para Produção

```bash
npm run build
npm start
```

## ✅ QA rápido

Checklist manual de validação do CRM:

- `CRM_SMOKE_TEST.md`

## 📄 Licença

MIT
