# 📖 QUICK REFERENCE - Sistema E-Commerce "Loja de Produtos"

**Guia rápido para consultação durante development**

---

## 🏗️ ARQUITETURA

```
Clean Architecture (4 camadas):
┌─────────────────────────────┐
│   API Layer (Controllers)    │ ← HTTP endpoints, versionamento
├─────────────────────────────┤
│ Application Layer (Services) │ ← Business logic, DTOs, validators
├─────────────────────────────┤
│Infrastructure (Repositories) │ ← EF Core, caching, external services
├─────────────────────────────┤
│   Domain (Entities)          │ ← Business rules, value objects
└─────────────────────────────┘

Database: PostgreSQL + Redis (cache)
Frontend: Next.js 14 + TypeScript + Zustand
```

---

## 🗄️ ENTITIES PRINCIPAIS

| Entity | Campos Chave | Relacionamentos | Docs |
|--------|-------------|-----------------|------|
| **User** | Id, Email, PasswordHash, IsEmailVerified | Orders, Reviews, Wishlists | ECOMMERCE_PLAN.md |
| **Product** | Id, Name, Price, SKU, Stock, Images | Categories, Variants, Reviews | ECOMMERCE_PLAN.md |
| **ProductVariant** | Id, SKU, PriceOverride, Stock, AttributeValues | Product, Images | ECOMMERCE_VARIANTS.md |
| **Cart/CartItem** | Id, UserId, Items, Total | User, Product | ECOMMERCE_PLAN.md |
| **Order** | Id, UserId, Status, Items, Total, PaymentId | User, Payment, Refunds | ECOMMERCE_PLAN.md |
| **OrderItem** | Id, ProductId, Quantity, Price, VariantId | Order, Product | ECOMMERCE_PLAN.md |
| **Payment** | Id, OrderId, Amount, Provider, Status | Order, Refunds | ECOMMERCE_PLAN.md |
| **Refund** | Id, PaymentId, Amount, Status, Reason | Payment, Recovery Codes | ECOMMERCE_REFUNDS.md |
| **Inventory** | Id, WarehouseId, ProductId, Quantity | Warehouse, Product | ECOMMERCE_INVENTORY.md |
| **ProductReview** | Id, ProductId, UserId, Rating, Content | Product, User, Replies | ECOMMERCE_REVIEWS.md |
| **Wishlist/Item** | Id, UserId, Items | User, Product | ECOMMERCE_REVIEWS.md |

---

## 🔑 PADRÕES & PATTERNS

### Repository Pattern
```csharp
// Sempre: Interface no Application, Implementation no Infrastructure
public interface IProductRepository
{
  Task<Product> GetByIdAsync(Guid id);
  Task<IEnumerable<Product>> GetAsync(Expression<Func<Product, bool>> predicate);
  Task AddAsync(Product entity);
  Task UpdateAsync(Product entity);
  Task DeleteAsync(Guid id);
}
```

### Service Layer
```csharp
// Business logic aqui, nunca nos controllers
public class ProductService
{
  private readonly IProductRepository _repository;
  public async Task<ProductDto> GetProductAsync(Guid id) { }
}
```

### DTO Versioning
```csharp
// API versioning: /api/v1/, /api/v2/
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/products")]
public class ProductsController : ControllerBase { }
```

### Idempotency (Payments, Webhooks)
```csharp
// Use correlation ID / idempotency key
[HttpPost("orders/{orderId}/payments")]
public async Task<IActionResult> CreatePayment(
  [FromHeader(Name = "Idempotency-Key")] string idempotencyKey)
{
  // Check if already processed
  var existing = await _repository.GetByIdempotencyKeyAsync(idempotencyKey);
  if (existing != null) return Ok(existing);
  
  // Process...
}
```

### Concurrency Control (Cart)
```csharp
// Use RowVersion para optimistic concurrency
public class Cart
{
  [Timestamp]  // EF Core managed
  public byte[] RowVersion { get; set; }
}

// Ao atualizar:
try
{
  await _context.SaveChangesAsync();
}
catch (DbUpdateConcurrencyException)
{
  // Retry ou informar usuário
}
```

---

## 📊 DATABASE SCHEMA

### Core Tables

```sql
-- Users & Auth
users (id, email, password_hash, full_name, is_email_verified, created_at)
refresh_tokens (id, user_id, token, expires_at)
user_sessions (id, user_id, device_id, last_ip, created_at)

-- Products & Catalog
products (id, name, price, sku, description, images, stock, created_at)
categories (id, name, parent_id)
product_categories (product_id, category_id)
product_variants (id, product_id, sku, name, price_override, stock, attribute_values)

-- Orders
orders (id, user_id, status, total, created_at)
order_items (id, order_id, product_id, variant_id, quantity, price)
cart (id, user_id, items, total)

-- Payments
payments (id, order_id, amount, provider, status, transaction_id)
refunds (id, payment_id, amount, status, reason)

-- Inventory
warehouses (id, name, location)
inventory (id, warehouse_id, product_id, quantity, reorder_level)

-- Features
product_reviews (id, product_id, user_id, rating, content, status)
wishlists (id, user_id, name, visibility)
wishlist_items (id, wishlist_id, product_id, variant_id)

-- Webhooks & Events
webhooks (id, url, event_types, secret, status)
webhook_deliveries (id, webhook_id, event_id, status, attempt)
```

---

## 🔐 SEGURANÇA CHECKLIST

```
□ JWT + Refresh Token rotation
□ HTTPS enforced
□ CORS configured properly
□ Rate limiting on auth endpoints
□ Password hashing (bcrypt)
□ Email verification required
□ 2FA TOTP enabled
□ SQL injection prevention (EF Core parameterization)
□ XSS protection (Content-Security-Policy headers)
□ CSRF tokens on forms
□ Audit logging for sensitive operations
□ PCI DSS compliance (no card data storage)
□ HMAC validation for webhooks
□ Encrypted sensitive data at rest
```

---

## 🧪 TESTING STRATEGY

| Layer | Pattern | Tools | Coverage |
|-------|---------|-------|----------|
| Unit | Arrange-Act-Assert | xUnit, Moq | 80%+ |
| Integration | Test Database | EF Core, WebApplicationFactory | 60%+ |
| E2E | Real flow | Playwright | 40%+ |
| Performance | Load testing | k6 | < 300ms p95 |

**Rodar testes:**
```bash
# Unit
dotnet test --filter "Category=Unit"

# Integration
dotnet test --filter "Category=Integration"

# E2E
npm run test:e2e

# Coverage
dotnet test --collect:"XPlat Code Coverage"
```

---

## 🌐 API RESPONSE FORMAT

```json
// ✅ Success
{
  "data": { /* entity */ },
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "hasNextPage": true
  },
  "errors": null
}

// ❌ Error
{
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Email is invalid",
      "field": "email"
    }
  ]
}

// ⚠️ Validation Error
HTTP 400
{
  "errors": {
    "email": ["Must be valid email"],
    "password": ["Must be at least 8 chars"]
  }
}

// 🔑 Auth Error
HTTP 401
{
  "errors": [{ "code": "UNAUTHORIZED", "message": "Invalid credentials" }]
}
```

---

## 📲 FRONTEND STATE MANAGEMENT (Zustand)

```typescript
// Store structure
const useStore = create<StateType>()((set) => ({
  // State
  user: null,
  isLoading: false,
  
  // Actions
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// Usage in component
const { user, isLoading, setUser } = useStore();

// With persistence
create<StateType>()(
  persist(
    (set) => ({ /* ... */ }),
    { name: 'storage-key' }
  )
);
```

---

## 🛠️ COMMON TASKS SNIPPETS

### 1️⃣ Create Entity with Validation

```csharp
// Domain/Entities/Product.cs
public class Product
{
  public Guid Id { get; set; }
  public string Name { get; set; }
  public decimal Price { get; set; }
  
  public static Product Create(string name, decimal price)
  {
    if (string.IsNullOrWhiteSpace(name))
      throw new DomainException("Name is required");
    if (price < 0)
      throw new DomainException("Price must be positive");
    
    return new Product { Id = Guid.NewGuid(), Name = name, Price = price };
  }
}
```

### 2️⃣ Create Service Method

```csharp
// Application/Services/ProductService.cs
public async Task<ProductDto> CreateProductAsync(CreateProductDto dto)
{
  // Validate
  var validator = new CreateProductValidator();
  var result = await validator.ValidateAsync(dto);
  if (!result.IsValid)
    throw new ValidationException(result.Errors);
  
  // Business logic
  var product = Product.Create(dto.Name, dto.Price);
  await _repository.AddAsync(product);
  
  // Return DTO
  return _mapper.Map<ProductDto>(product);
}
```

### 3️⃣ Create API Endpoint

```csharp
[ApiController]
[Route("api/v1/products")]
public class ProductsController : ControllerBase
{
  [HttpPost]
  [Authorize]
  [ProducesResponseType(StatusCodes.Status201Created)]
  public async Task<IActionResult> Create(CreateProductDto dto)
  {
    var product = await _service.CreateProductAsync(dto);
    return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
  }
}
```

### 4️⃣ Create React Component

```typescript
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function ProductList() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then(r => r.data)
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {products?.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}
```

### 5️⃣ Create Webhook Handler

```csharp
// Receiver-side (seu sistema recebendo webhook)
[HttpPost("webhooks/payment")]
[AllowAnonymous]
public async Task<IActionResult> HandlePaymentWebhook([FromBody] PaymentWebhookDto dto)
{
  // Validate signature
  var signature = Request.Headers["X-Webhook-Signature"];
  if (!ValidateSignature(JsonSerializer.Serialize(dto), signature, _secret))
    return Unauthorized();
  
  // Process idempotently
  await _service.ProcessPaymentAsync(dto);
  
  return Ok();
}
```

---

## 📌 TASK CHECKLIST TEMPLATE

Copie para implementar qualquer feature:

```markdown
## Feature: [Name]

### Database
- [ ] Migration: [table]
- [ ] Indexes: [columns]
- [ ] Constraints: [rules]

### Backend
- [ ] Entity: [Class.cs]
- [ ] DTOs: Create, Update, Get
- [ ] Validator: [FluentValidation]
- [ ] Service: [IService + Implementation]
- [ ] Repository: [IRepository + Implementation]
- [ ] Controller: [Endpoints]

### Frontend
- [ ] Hook: [useFeature]
- [ ] Store: [Zustand state]
- [ ] Components: [Component1, Component2]
- [ ] Page: [page.tsx]

### Testing
- [ ] Unit: [Services]
- [ ] Integration: [Repository]
- [ ] E2E: [User flow]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

---

## 🚀 DEPLOY CHECKLIST

```
□ Environment variables configured (.env.production)
□ Database migrations applied
□ Cache warming (Redis)
□ HTTPS/SSL certificate
□ Logging configured (Serilog to File/ELK)
□ Monitoring setup (Prometheus, Grafana)
□ Health check endpoints
□ Backup strategy (daily)
□ Rate limiting configured
□ CORS policies set
□ API docs available
□ Error handling tested
□ Load testing passed (k6)
□ Security scan passed
```

---

## 📞 DOCUMENTO POR TÓPICO

| Tópico | Documento Principal | Secundário |
|--------|-------------------|-----------|
| Arquitetura | ECOMMERCE_PLAN.md | ECOMMERCE_DEVOPS.md |
| Autenticação | ECOMMERCE_PLAN.md | ECOMMERCE_2FA.md |
| Pagamentos | ECOMMERCE_PLAN.md | ECOMMERCE_REFUNDS.md |
| Frontend | ECOMMERCE_FRONTEND.md | ECOMMERCE_ADMIN_PANEL.md |
| Testes | ECOMMERCE_TESTING.md | ECOMMERCE_TASKS.md |
| Deployment | ECOMMERCE_DEVOPS.md | ECOMMERCE_COMPLIANCE.md |
| Segurança | ECOMMERCE_COMPLIANCE.md | ECOMMERCE_WEBHOOKS.md |
| Inventory | ECOMMERCE_INVENTORY.md | ECOMMERCE_VARIANTS.md |
| Shipping | ECOMMERCE_SHIPPING.md | ECOMMERCE_PLAN.md |
| Reviews | ECOMMERCE_REVIEWS.md | ECOMMERCE_ANALYTICS.md |
| Analytics | ECOMMERCE_ANALYTICS.md | ECOMMERCE_ADMIN_PANEL.md |

---

## 🎯 SPRINT PLANNING

```
Sprint 1 (1 week)
├─ Backend base + DB setup
├─ User entity + Auth scaffolding
└─ First API endpoint

Sprint 2 (1 week)
├─ Product entity + Variants
├─ Cart logic
└─ Search implementation

Sprint 3 (1 week)
├─ Orders
├─ Payments integration
└─ Webhook setup

Sprint 4 (1 week)
├─ Refunds
├─ Email notifications
└─ 2FA

Sprints 5+ (as needed)
├─ Admin Panel
├─ Analytics
├─ Shipping
└─ Reviews/Wishlist
```

---

**Bookmark this! Consulte frequentemente durante o desenvolvimento! 📚**
