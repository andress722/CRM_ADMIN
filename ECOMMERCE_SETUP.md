# 📱 E-Commerce - Guia de Setup Completo

## Sistema Completo

Seu e-commerce agora possui:

✅ **Backend ASP.NET Core 9.0** - API REST com Clean Architecture
✅ **Admin Dashboard Next.js 14** - Interface de gerenciamento
✅ **Banco de Dados** - In-memory com suporte a PostgreSQL
✅ **Cache** - Redis (Docker)
✅ **API Documentation** - Swagger UI

---

## 🚀 Como Rodar

### 1. Iniciar o Backend API

**Terminal 1:**
```bash
cd c:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main\src\Ecommerce.API
dotnet run
```

A API estará disponível em: `http://localhost:5071`

Swagger UI: `http://localhost:5071/swagger`

### 2. Iniciar o Admin Dashboard

**Terminal 2:**
```bash
cd c:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main\admin-frontend
npm install  # Primeira vez apenas
npm run dev
```

O Dashboard estará disponível em: `http://localhost:3000`

---

## 📊 Estrutura do Projeto

```
copilot-sdk-main/
├── src/
│   ├── Ecommerce.Domain/          # Entidades e interfaces
│   ├── Ecommerce.Application/     # Serviços e lógica
│   ├── Ecommerce.Infrastructure/  # Repositórios e DbContext
│   └── Ecommerce.API/             # Controllers e configuração
│
└── admin-frontend/                # Next.js admin dashboard
    ├── app/                       # Páginas
    ├── components/                # Componentes React
    ├── lib/                       # API client e store
    └── package.json
```

---

## 🔌 Endpoints da API

### Estatísticas (Admin)
```
GET  /api/v1/admin/statistics/dashboard   - KPIs principais
GET  /api/v1/admin/statistics/sales       - Estatísticas de vendas
GET  /api/v1/admin/statistics/top-products - Top 10 produtos
GET  /api/v1/admin/statistics/top-categories - Categorias top
GET  /api/v1/admin/statistics/revenue     - Receita
```

### Produtos (Admin CRUD)
```
GET    /api/v1/products                     - Listar todos
GET    /api/v1/products/{id}                - Detalhes
POST   /api/v1/products                     - Criar
PUT    /api/v1/products/{id}                - Editar
DELETE /api/v1/admin/products/{id}          - Deletar
PATCH  /api/v1/admin/products/{id}/stock    - Atualizar estoque
```

### Pedidos (Admin)
```
GET  /api/v1/admin/orders                    - Listar todos
GET  /api/v1/admin/orders/{id}/details       - Detalhes
GET  /api/v1/admin/orders/status/{status}    - Por status
PATCH /api/v1/orders/{id}/status             - Atualizar status
```

### Usuários
```
GET  /api/v1/admin/users       - Listar todos
GET  /api/v1/admin/users/{id}  - Detalhes
POST /api/v1/users             - Criar usuário
```

### Carrinho & Pagamentos
```
GET    /api/v1/cart/{userId}           - Carrinho do usuário
POST   /api/v1/cart/items              - Adicionar item
PUT    /api/v1/cart/items/{id}         - Atualizar quantidade
DELETE /api/v1/cart/items/{id}         - Remover item
DELETE /api/v1/cart/{userId}           - Limpar carrinho

POST /api/v1/payments                  - Criar pagamento
POST /api/v1/payments/{id}/authorize   - Autorizar
POST /api/v1/payments/{id}/capture     - Capturar
```

---

## 📦 Entidades do Banco de Dados

### User
```csharp
Id: Guid
Email: string
FullName: string
PasswordHash: string
IsEmailVerified: bool
CreatedAt: DateTime
```

### Product
```csharp
Id: Guid
Name: string
Description: string
Price: decimal
Stock: int
Category: string
SKU: string
IsActive: bool
CreatedAt: DateTime
UpdatedAt: DateTime?
```

### Order
```csharp
Id: Guid
UserId: Guid
Status: OrderStatus (Pending, Confirmed, Shipped, Delivered, Cancelled)
TotalAmount: decimal
Items: List<OrderItem>
CreatedAt: DateTime
UpdatedAt: DateTime?
```

### OrderItem
```csharp
Id: Guid
OrderId: Guid
ProductId: Guid
Quantity: int
UnitPrice: decimal
Subtotal: decimal
```

### CartItem
```csharp
Id: Guid
UserId: Guid
ProductId: Guid
Quantity: int
AddedAt: DateTime
```

### Payment
```csharp
Id: Guid
OrderId: Guid
Method: PaymentMethod (CreditCard, DebitCard, PayPal, BankTransfer)
Status: PaymentStatus (Pending, Authorized, Captured, Refunded, Failed)
Amount: decimal
TransactionId: string
CreatedAt: DateTime
UpdatedAt: DateTime?
```

---

## 🎯 Funcionalidades Admin

### Dashboard
- 📊 Total de pedidos
- 💰 Receita total
- ⏳ Pedidos pendentes
- ✅ Pedidos completos
- 📈 Valor médio por pedido

### Produtos
- 📝 Tabela com todos os produtos
- ➕ Criar novo produto
- ✏️ Editar produto
- 🗑️ Deletar produto
- 🔍 Filtrar por nome/categoria
- 📦 Gerenciar estoque

### Pedidos
- 📋 Lista de pedidos com filtros
- 🔄 Atualizar status
- 📊 Ver itens do pedido
- 💵 Valores associados

### Usuários
- 👥 Lista de usuários
- ✉️ Email e status
- 📅 Data de cadastro
- ✔️ Verificação de email

### Relatórios
- 📊 Gráfico de top 10 produtos
- 🥧 Distribuição por categoria
- 📈 Receita por produto

---

## 🔧 Configurações

### Backend (.env ou appsettings.json)

Atualmente usando banco **in-memory**. Para usar **PostgreSQL**:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=ecommerce;Username=postgres;Password=password"
}
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:5071/api/v1
```

---

## 🐳 Docker (Opcional)

Redis e PostgreSQL estão rodando em Docker:

```bash
# Ver containers
docker ps

# PostgreSQL logs
docker logs ecommerce-postgres

# Redis logs
docker logs ecommerce-redis
```

---

## 🔐 Próximos Passos

### Para Produção:

1. **Autenticação**
   - Implementar JWT no backend
   - Adicionar middleware de autenticação
   - Proteger rotas admin

2. **Banco de Dados**
   - Migrar de in-memory para PostgreSQL
   - Configurar migrations
   - Backup automático

3. **Cache**
   - Integrar Redis
   - Cache de produtos
   - Sessões

4. **Segurança**
   - CORS configuration
   - Rate limiting
   - Input validation
   - SQL injection prevention

5. **Deploy**
   - Azure App Service (Backend)
   - Vercel (Frontend)
   - Configurar CI/CD

---

## 📊 Exemplo de Fluxo

### Criar um Produto via API:
```bash
curl -X POST http://localhost:5071/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notebook",
    "description": "Notebook de alta performance",
    "price": 3500.00,
    "stock": 10,
    "category": "Eletrônicos",
    "sku": "NB-001"
  }'
```

### Visualizar no Dashboard:
1. Abra `http://localhost:3000`
2. Vá para aba "Produtos"
3. Veja o novo produto na tabela
4. Edite ou delete conforme necessário

---

## 🛠️ Tech Stack Resumido

| Camada | Tecnologia |
|--------|-----------|
| **Backend** | ASP.NET Core 9.0, EF Core 8.0 |
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Estilo** | Tailwind CSS 3.3 |
| **Gráficos** | Recharts 2.10 |
| **State** | Zustand 4.4 |
| **HTTP** | Axios 1.6 |
| **Database** | PostgreSQL 16 (in-memory dev) |
| **Cache** | Redis 7 |
| **API Docs** | Swagger UI |

---

## 📞 Suporte

Para erros:
1. Verifique se a API está rodando em `http://localhost:5071/swagger`
2. Verifique se o frontend pode acessar a API (CORS)
3. Verifique os logs no terminal

---

## ✨ Features Implementadas

✅ Specification documentos (22 documentos)
✅ Clean Architecture Backend
✅ 6 Entidades completas
✅ 5 Serviços com lógica
✅ 5 Repositórios pattern
✅ 6 Controllers REST
✅ Admin CRUD para produtos
✅ Estatísticas e relatórios
✅ Admin Dashboard Next.js
✅ Tabelas com filtros
✅ Modais de edição
✅ Gráficos e charts
✅ Responsivo (mobile/tablet/desktop)

---

Seu e-commerce está pronto! 🎉
