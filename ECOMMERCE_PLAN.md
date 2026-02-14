# PLANO TÉCNICO - SISTEMA E-COMMERCE "Loja de Produtos"

**Versão:** 1.0  
**Data:** Janeiro 2026  
**Escopo:** Loja completa com foco em segurança, confiabilidade e pagamentos

---

## 1. ARQUITETURA GERAL

### 1.1 Visão Estratificada

```
┌─────────────────────────────────────────────┐
│       FRONTEND - Next.js + TypeScript       │
│  (SPA, Server Components, Middleware Auth)  │
└──────────────────┬──────────────────────────┘
                   │ HTTP/REST
                   ↓
┌─────────────────────────────────────────────┐
│   BACKEND - ASP.NET Core 8 Web API          │
│  ┌─────────────────────────────────────────┐│
│  │ API Layer (Controllers / Endpoints)     ││
│  ├─────────────────────────────────────────┤│
│  │ Application Layer (Services, Handlers)  ││
│  ├─────────────────────────────────────────┤│
│  │ Domain Layer (Entities, Value Objects)  ││
│  ├─────────────────────────────────────────┤│
│  │ Infrastructure (Repos, EF Core, Integrations)││
│  └─────────────────────────────────────────┘│
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────┐
        ↓                     ↓          ↓
   ┌─────────┐          ┌──────────┐  ┌──────────┐
   │PostgreSQL│          │Mercado   │  │PayPal /  │
   │Database  │          │Pago      │  │Infinite  │
   └─────────┘          └──────────┘  │Pay       │
                                      └──────────┘
```

### 1.2 Estrutura de Projetos (Solution)

```
EcommerceSolution/
├── src/
│   ├── Ecommerce.Domain/          # Camada de Domínio
│   │   ├── Entities/              # User, Product, Order, Cart, etc.
│   │   ├── ValueObjects/          # Money, Email, PhoneNumber, etc.
│   │   ├── Interfaces/            # IRepository, IUnitOfWork, etc.
│   │   ├── Exceptions/            # DomainException, ValidationException
│   │   └── Events/                # Domain Events (CartCreated, OrderPlaced, etc.)
│   │
│   ├── Ecommerce.Application/     # Camada de Aplicação
│   │   ├── Services/              # CartService, OrderService, PaymentService
│   │   ├── Handlers/              # Command/Query Handlers (CQRS opcional)
│   │   ├── DTOs/                  # Request/Response DTOs (versionados)
│   │   ├── Validators/            # Fluent Validation
│   │   ├── Mapping/               # AutoMapper profiles
│   │   └── Interfaces/            # ICartService, IOrderService, etc.
│   │
│   ├── Ecommerce.Infrastructure/  # Camada de Infraestrutura
│   │   ├── Persistence/           # EF Core DbContext, Migrations
│   │   ├── Repositories/          # Repository implementations
│   │   ├── ExternalServices/      # Mercado Pago, PayPal, etc.
│   │   ├── Caching/               # Redis strategies
│   │   ├── Email/                 # SMTP, SendGrid integration
│   │   └── Logging/               # Serilog, Application Insights
│   │
│   └── Ecommerce.API/             # Camada de Apresentação (API)
│       ├── Controllers/           # v1/, v2/ routes
│       ├── Middleware/            # Auth, ErrorHandling, RateLimit
│       ├── Extensions/            # DI, Health Checks
│       └── Program.cs             # Bootstrap
│
├── tests/
│   ├── Ecommerce.Domain.Tests/    # Unit tests
│   ├── Ecommerce.Application.Tests/
│   ├── Ecommerce.Infrastructure.Tests/
│   └── Ecommerce.API.IntegrationTests/
│
└── docs/
    ├── API.md                     # OpenAPI/Swagger
    ├── ARCHITECTURE.md
    └── SECURITY.md
```

### 1.3 Versionamento de API

```
GET /api/v1/products           # Versão 1 (legacy)
GET /api/v2/products           # Versão 2 (current, breaking changes)

Headers:
  X-API-Version: 2
  X-Client-Version: 1.0.0
```

- Versionamento via URL path (`/api/v1`, `/api/v2`)
- DTOs versionados em `Application/DTOs/v1/`, `Application/DTOs/v2/`
- Manutenção de compatibilidade com versões prévias por **no mínimo 6 meses**

---

## 2. MODELAGEM DE DADOS (EF Core + PostgreSQL)

### 2.1 Diagrama de Entidades

```
┌──────────────────────────────────────────────────────────────────┐
│ IDENTITY & SECURITY                                              │
├──────────────────────────────────────────────────────────────────┤
│ User (Id, Email, PasswordHash, Phone, IsEmailVerified)           │
│   └─ EmailVerificationToken (Token, ExpiresAt, IsUsed)          │
│   └─ RefreshToken (Token, ExpiresAt, IsRevoked, DeviceId)       │
│   └─ AuditLog (Action, IP, UserAgent, CreatedAt)                │
│   └─ UserSession (DeviceId, LastActivityAt, ExpiresAt)          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ CATALOGO                                                         │
├──────────────────────────────────────────────────────────────────┤
│ Category (Id, Name, Slug, Description, ParentCategoryId)        │
│ Product (Id, Sku, Name, Description, Price, Stock, IsActive)   │
│   └─ ProductImage (Id, Url, IsMain, DisplayOrder)              │
│   └─ ProductTag (Name)                                           │
│   └─ ProductVariation (Id, Type, Value, Sku, Stock)            │
│ ProductSearchIndex (Id, ProductId, SearchVector, UpdatedAt)    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ CARRINHO & CHECKOUT                                              │
├──────────────────────────────────────────────────────────────────┤
│ Cart (Id, UserId, GuestCartId, Status, RowVersion, CreatedAt)   │
│   └─ CartItem (Id, CartId, ProductId, Qty, PriceSnapshot, RowVersion)
│ CartIdempotencyKey (CartId, OperationKey, CreatedAt)            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ PROMOÇÕES & CUPONS                                               │
├──────────────────────────────────────────────────────────────────┤
│ Promotion (Id, Name, Type[%/R$], Value, Rules, Priority)        │
│   ├─ PromotionRule (Id, AppliesTo[Category/Product], DateRange)│
│   └─ PromotionExclusion (CanCombineWith[other promotions])      │
│ Coupon (Id, Code, Type, Value, MinOrder, DateRange)            │
│   └─ CouponRedemption (Id, CouponId, UserId, OrderId, UsedAt) │
│   └─ CouponUsageLimit (MaxTotal, MaxPerUser, CurrentCount)    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ PEDIDOS & PAGAMENTOS                                             │
├──────────────────────────────────────────────────────────────────┤
│ Order (Id, UserId, Status, TotalAmount, SubtotalAmount,         │
│        TaxAmount, DiscountAmount, RowVersion, CreatedAt)        │
│   ├─ OrderItem (Id, OrderId, ProductId, Qty, UnitPrice,        │
│   │             NameSnapshot, SkuSnapshot)                      │
│   ├─ OrderPromotion (OrderId, PromotionId, DiscountAmount)    │
│   └─ OrderCoupon (OrderId, CouponId, DiscountAmount)           │
│ Payment (Id, OrderId, ProviderId, ProviderOrderId,             │
│          Status, Amount, Method, CreatedAt, UpdatedAt)        │
│   └─ PaymentLog (Id, PaymentId, Event, Response, Timestamp)   │
│ WebhookEvent (Id, Provider, EventType, ExternalId, Payload,   │
│               IsProcessed, ProcessedAt, CreatedAt)            │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Definição Detalhada de Tabelas

#### **Users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone_number VARCHAR(20),
    is_email_verified BOOLEAN DEFAULT FALSE,
    lockout_end_time TIMESTAMP,
    login_attempts INT DEFAULT 0,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **EmailVerificationToken**
```sql
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_tokens_token ON email_verification_tokens(token);
```

#### **RefreshToken** (com rotação)
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_family_id UUID,  -- Para rastrear rotação
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    device_id VARCHAR(255),        -- Para sessões por dispositivo
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

#### **AuditLog**
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,  -- Login, PasswordReset, CartModified, OrderCreated
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

#### **Product**
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_is_active ON products(is_active);
```

#### **ProductImage**
```sql
CREATE TABLE product_images (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(512) NOT NULL,
    is_main BOOLEAN DEFAULT FALSE,
    display_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);
```

#### **Category**
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
```

#### **Cart** (com controle de concorrência)
```sql
CREATE TABLE carts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    guest_cart_id UUID,  -- Para carrinhos de convidados
    status VARCHAR(20) DEFAULT 'active',  -- active, merged, abandoned
    row_version BIGINT DEFAULT 0,  -- Otimistic concurrency
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_or_guest UNIQUE (
        COALESCE(user_id, 'guest'::uuid),
        COALESCE(guest_cart_id, 'guest'::uuid)
    )
);

CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_guest_id ON carts(guest_cart_id);
```

#### **CartItem** (com snapshot de preço)
```sql
CREATE TABLE cart_items (
    id UUID PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    price_snapshot DECIMAL(10, 2) NOT NULL,  -- Preço no momento da adição
    name_snapshot VARCHAR(255),
    sku_snapshot VARCHAR(50),
    row_version BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
```

#### **CartIdempotencyKey**
```sql
CREATE TABLE cart_idempotency_keys (
    id UUID PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    operation_key VARCHAR(255) NOT NULL,  -- Hash(action + timestamp + clientId)
    response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, operation_key)
);
```

#### **Promotion**
```sql
CREATE TABLE promotions (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL,  -- 'percentage' ou 'fixed'
    value DECIMAL(10, 2) NOT NULL,
    min_order DECIMAL(10, 2),
    max_discount DECIMAL(10, 2),
    applies_to VARCHAR(50) NOT NULL,  -- 'category' ou 'product'
    priority INT,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotions_active_dates ON promotions(is_active, valid_from, valid_until);
```

#### **Coupon**
```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,  -- 'percentage' ou 'fixed'
    value DECIMAL(10, 2) NOT NULL,
    min_order DECIMAL(10, 2),
    max_uses INT,
    max_uses_per_user INT DEFAULT 1,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
```

#### **Order**
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL,  -- CREATED, PENDING_PAYMENT, PAID, FAILED, CANCELED, SHIPPED
    subtotal_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    row_version BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

#### **OrderItem**
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    name_snapshot VARCHAR(255),
    sku_snapshot VARCHAR(50)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

#### **Payment**
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
    provider VARCHAR(50) NOT NULL,  -- 'mercado_pago', 'paypal', 'infinitepay'
    provider_payment_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL,  -- pending, completed, failed, cancelled
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    method VARCHAR(50),  -- credit_card, pix, boleto, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_provider_id ON payments(provider, provider_payment_id);
CREATE INDEX idx_payments_status ON payments(status);
```

#### **WebhookEvent** (para idempotência)
```sql
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    external_id VARCHAR(255) UNIQUE NOT NULL,  -- ID único do provider
    payload JSONB NOT NULL,
    is_processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    retry_count INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_events_external_id ON webhook_events(external_id);
CREATE INDEX idx_webhook_events_provider_type ON webhook_events(provider, event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(is_processed);
```

---

## 3. CARRINHO RESILIENTE & IDEMPOTÊNCIA

### 3.1 Fluxo de Operações no Carrinho

```
CLIENT REQUEST
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. Verificar Idempotency Key (CartIdempotencyKey)           │
│    Se existe → retornar resposta anterior (cached)          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Aplicar Otimistic Concurrency (RowVersion)               │
│    SELECT rowVersion WHERE cartId = @cartId                 │
│    IF rowVersion != cliente.rowVersion → CONFLICT           │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Validar Estoque em Tempo Real                             │
│    SELECT stock FROM products WHERE id = @productId         │
│    IF stock < requestedQty → INSUFFICIENT_STOCK error       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Recalcular Preço (promotions + cupons)                   │
│    Aplicar promoções ativas + verificar cupom se fornecido  │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Atualizar Cart (com transação + versão incrementada)     │
│    BEGIN TRANSACTION                                         │
│    UPDATE carts SET rowVersion = rowVersion + 1 WHERE ...   │
│    UPDATE/INSERT cart_items                                  │
│    COMMIT                                                    │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Armazenar Idempotency Response                            │
│    INSERT cart_idempotency_keys (operation_key, response)   │
│    TTL: 24 horas                                             │
└─────────────────────────────────────────────────────────────┘
    ↓
RETURN { status: 200, cart, rowVersion }
```

### 3.2 Merge de Carrinho ao Fazer Login

```
LOGIN SUCCESSFUL
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. Recuperar Guest Cart (via guestCartId do cookie/storage) │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Recuperar User Cart (via userId)                          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Se ambos existem:                                         │
│    - Mesclar items (aplicar último preço/promoção)          │
│    - Remover duplicatas (manter qty somada)                 │
│    - Atualizar rowVersion                                    │
│    - Marcar guestCart como "merged"                          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Validar estoque novamente (pode ter mudado)              │
│    Se algum item não tem estoque → notificar usuário        │
└─────────────────────────────────────────────────────────────┘
    ↓
RETURN merged cart
```

### 3.3 Código - Exemplo (C#)

```csharp
// Domain/Entities/Cart.cs
public class Cart
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public Guid? GuestCartId { get; set; }
    public CartStatus Status { get; set; }
    public long RowVersion { get; set; }  // Concurrency token
    
    public List<CartItem> Items { get; set; }
    
    public void AddItem(Product product, int quantity, decimal currentPrice)
    {
        var existingItem = Items.FirstOrDefault(i => i.ProductId == product.Id);
        if (existingItem != null)
        {
            existingItem.Quantity += quantity;
        }
        else
        {
            Items.Add(new CartItem
            {
                ProductId = product.Id,
                Quantity = quantity,
                PriceSnapshot = currentPrice,
                NameSnapshot = product.Name,
                SkuSnapshot = product.Sku
            });
        }
        
        RowVersion++;  // Increment version
    }
}

// Application/Services/CartService.cs
public class CartService : ICartService
{
    private readonly ICartRepository _cartRepository;
    private readonly IProductRepository _productRepository;
    private readonly IPromotionService _promotionService;
    private readonly IIdempotencyService _idempotencyService;

    public async Task<CartDto> AddItemAsync(
        Guid cartId, 
        Guid productId, 
        int quantity,
        string idempotencyKey,
        long expectedRowVersion)
    {
        // 1. Verificar idempotência
        var cachedResponse = await _idempotencyService.GetAsync(cartId, idempotencyKey);
        if (cachedResponse != null)
            return cachedResponse;

        // 2. Recuperar carrinho
        var cart = await _cartRepository.GetByIdAsync(cartId)
            ?? throw new CartNotFoundException();

        // Verificar concorrência
        if (cart.RowVersion != expectedRowVersion)
            throw new ConcurrencyException("Cart was modified");

        // 3. Validar estoque
        var product = await _productRepository.GetByIdAsync(productId)
            ?? throw new ProductNotFoundException();
        
        if (product.Stock < quantity)
            throw new InsufficientStockException();

        // 4. Recalcular preços
        var currentPrice = await _promotionService.GetCurrentPriceAsync(product);

        // 5. Adicionar item (com transação)
        cart.AddItem(product, quantity, currentPrice);
        await _cartRepository.UpdateAsync(cart);
        await _cartRepository.SaveChangesAsync();

        // 6. Armazenar resposta
        var dto = MapToDto(cart);
        await _idempotencyService.StoreAsync(cartId, idempotencyKey, dto, TimeSpan.FromHours(24));

        return dto;
    }

    public async Task<CartDto> MergeGuestCartAsync(Guid userId, Guid guestCartId)
    {
        var guestCart = await _cartRepository.GetByGuestIdAsync(guestCartId);
        var userCart = await _cartRepository.GetByUserIdAsync(userId) 
            ?? new Cart { UserId = userId };

        if (guestCart != null && guestCart.Items.Any())
        {
            foreach (var guestItem in guestCart.Items)
            {
                var userItem = userCart.Items
                    .FirstOrDefault(i => i.ProductId == guestItem.ProductId);
                
                if (userItem != null)
                    userItem.Quantity += guestItem.Quantity;
                else
                    userCart.Items.Add(guestItem);
            }

            guestCart.Status = CartStatus.Merged;
            await _cartRepository.UpdateAsync(guestCart);
        }

        await _cartRepository.UpdateAsync(userCart);
        await _cartRepository.SaveChangesAsync();

        return MapToDto(userCart);
    }
}

// EF Core - DbContext configuration
modelBuilder.Entity<Cart>()
    .Property(c => c.RowVersion)
    .IsRowVersion();  // Automatic handling by EF Core
```

---

## 4. SISTEMA DE PAGAMENTOS

### 4.1 Arquitetura de Abstração

```
┌─────────────────────────────────────┐
│    IPaymentProvider (Interface)     │
├─────────────────────────────────────┤
│ CreatePaymentAsync(order, config)   │
│ GetPaymentStatusAsync(providerId)   │
│ RefundAsync(paymentId, amount)      │
│ ValidateWebhookAsync(payload, sig)  │
└─────────────────────────────────────┘
         ↗          ↑          ↖
        /           |           \
   MercadoPago   PayPal      InfinitePay
   Provider      Provider     Provider
```

### 4.2 Fluxo de Criação de Pagamento

```
ORDER CREATED (status: PENDING_PAYMENT)
    ↓
┌──────────────────────────────────────────────────────────┐
│ Endpoint: POST /api/v1/payments/create                   │
│ Params: orderId, provider (mercado_pago|paypal|etc)      │
└──────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────┐
│ 1. Validar order existe e status = PENDING_PAYMENT       │
│ 2. Recuperar IPaymentProvider via Factory               │
│ 3. Chamar provider.CreatePaymentAsync(order)            │
│    → Retorna: { paymentUrl, providerPaymentId }         │
└──────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────┐
│ 4. Persistir Payment entity:                             │
│    - order_id, provider, provider_payment_id             │
│    - status = "pending"                                  │
│    - Salvar com transação                                │
└──────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────┐
│ 5. Response: { paymentUrl, redirectTo }                  │
│    Cliente redireciona para URL do provider              │
└──────────────────────────────────────────────────────────┘
    ↓
CLIENT REDIRECTS TO PAYMENT PROVIDER
    ↓
[USER COMPLETES PAYMENT]
    ↓
PROVIDER SENDS WEBHOOK
    ↓
┌──────────────────────────────────────────────────────────┐
│ POST /api/v1/webhooks/payment-status                     │
│ Body: { orderId, status, externalId, signature }        │
└──────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────┐
│ 1. Validar signature (HMAC-SHA256)                       │
│ 2. Verificar WebhookEvent já processado (idempotência)  │
│    SE SIM → retornar 200 OK (sem processar)             │
│    SE NÃO → continuar                                    │
└──────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────┐
│ 3. Atualizar Payment.status = "completed"               │
│ 4. Atualizar Order.status = "PAID"                      │
│ 5. Disparar Event: PaymentConfirmed (async)            │
│ 6. Marcar WebhookEvent como processado                 │
└──────────────────────────────────────────────────────────┘
    ↓
ORDER STATUS: PAID ✓
```

### 4.3 Implementação - C#

```csharp
// Domain/Interfaces/IPaymentProvider.cs
public interface IPaymentProvider
{
    Task<PaymentCreationResult> CreatePaymentAsync(Order order, PaymentConfig config);
    Task<PaymentStatusResult> GetPaymentStatusAsync(string providerPaymentId);
    Task<bool> ValidateWebhookAsync(string payload, string signature);
}

// Infrastructure/ExternalServices/MercadoPagoProvider.cs
public class MercadoPagoProvider : IPaymentProvider
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<MercadoPagoConfig> _config;
    private readonly ILogger<MercadoPagoProvider> _logger;

    public async Task<PaymentCreationResult> CreatePaymentAsync(Order order, PaymentConfig config)
    {
        var request = new
        {
            external_reference = order.Id.ToString(),
            title = "Compra - Loja Produtos",
            quantity = 1,
            unit_price = (double)order.TotalAmount,
            payer = new { email = order.User.Email },
            back_urls = new
            {
                success = config.SuccessUrl,
                failure = config.FailureUrl,
                pending = config.PendingUrl
            },
            notification_url = config.WebhookUrl
        };

        try
        {
            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            content.Headers.Add("Authorization", $"Bearer {_config.Value.AccessToken}");

            var response = await _httpClient.PostAsync(
                "https://api.mercadopago.com/checkout/preferences",
                content);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadAsAsync<MercadoPagoPreference>();

            _logger.LogInformation($"Payment created for order {order.Id}: {result.Id}");

            return new PaymentCreationResult
            {
                ProviderPaymentId = result.Id,
                PaymentUrl = result.InitPoint,
                SandboxUrl = result.SandboxInitPoint
            };
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating Mercado Pago payment: {ex.Message}");
            throw;
        }
    }

    public async Task<bool> ValidateWebhookAsync(string payload, string signature)
    {
        // HMAC-SHA256 validation
        var key = Encoding.UTF8.GetBytes(_config.Value.WebhookSecret);
        using (var hmac = new HMACSHA256(key))
        {
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computedSignature = Convert.ToBase64String(hash);
            return computedSignature == signature;
        }
    }
}

// Application/Services/PaymentService.cs
public class PaymentService : IPaymentService
{
    private readonly IPaymentProviderFactory _providerFactory;
    private readonly IOrderRepository _orderRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IWebhookEventRepository _webhookRepository;

    public async Task<PaymentInitiationResult> InitiatePaymentAsync(
        Guid orderId, 
        string provider)
    {
        var order = await _orderRepository.GetByIdAsync(orderId)
            ?? throw new OrderNotFoundException();

        if (order.Status != OrderStatus.PendingPayment)
            throw new InvalidOrderStatusException();

        var paymentProvider = _providerFactory.GetProvider(provider);
        
        var result = await paymentProvider.CreatePaymentAsync(
            order,
            new PaymentConfig
            {
                SuccessUrl = $"https://app.com/payment/success?orderId={orderId}",
                FailureUrl = $"https://app.com/payment/failure?orderId={orderId}",
                WebhookUrl = "https://api.app.com/webhooks/payment-status"
            });

        var payment = new Payment
        {
            OrderId = orderId,
            Provider = provider,
            ProviderPaymentId = result.ProviderPaymentId,
            Amount = order.TotalAmount,
            Status = PaymentStatus.Pending
        };

        await _paymentRepository.AddAsync(payment);
        await _paymentRepository.SaveChangesAsync();

        return new PaymentInitiationResult
        {
            PaymentUrl = result.PaymentUrl,
            Provider = provider
        };
    }

    public async Task<bool> HandleWebhookAsync(
        string provider,
        string payload,
        string signature)
    {
        // 1. Validar assinatura
        var paymentProvider = _providerFactory.GetProvider(provider);
        if (!await paymentProvider.ValidateWebhookAsync(payload, signature))
            throw new InvalidWebhookSignatureException();

        var webhookData = JsonSerializer.Deserialize<WebhookPayload>(payload);
        
        // 2. Verificar idempotência
        var existingEvent = await _webhookRepository.GetByExternalIdAsync(webhookData.Id);
        if (existingEvent?.IsProcessed ?? false)
        {
            return true;  // Já processado, retornar sucesso silenciosamente
        }

        // 3. Persistir evento
        var webhookEvent = new WebhookEvent
        {
            Provider = provider,
            EventType = webhookData.EventType,
            ExternalId = webhookData.Id,
            Payload = payload,
            IsProcessed = false
        };

        if (existingEvent != null)
            webhookEvent = existingEvent;
        else
            await _webhookRepository.AddAsync(webhookEvent);

        await _webhookRepository.SaveChangesAsync();

        // 4. Processar pagamento
        var payment = await _paymentRepository.GetByProviderIdAsync(webhookData.PaymentId);
        if (payment == null)
            throw new PaymentNotFoundException();

        var order = await _orderRepository.GetByIdAsync(payment.OrderId);

        // 5. Atualizar status
        if (webhookData.Status == "approved")
        {
            payment.Status = PaymentStatus.Completed;
            order.Status = OrderStatus.Paid;
        }
        else if (webhookData.Status == "rejected")
        {
            payment.Status = PaymentStatus.Failed;
            order.Status = OrderStatus.Failed;
        }

        await _orderRepository.UpdateAsync(order);
        await _paymentRepository.UpdateAsync(payment);

        webhookEvent.IsProcessed = true;
        webhookEvent.ProcessedAt = DateTime.UtcNow;
        await _webhookRepository.UpdateAsync(webhookEvent);
        await _webhookRepository.SaveChangesAsync();

        // 6. Publicar event
        await _eventPublisher.PublishAsync(new PaymentConfirmedEvent(order.Id));

        return true;
    }
}

// Infrastructure/Services/PaymentProviderFactory.cs
public class PaymentProviderFactory : IPaymentProviderFactory
{
    private readonly IServiceProvider _serviceProvider;

    public IPaymentProvider GetProvider(string providerName)
    {
        return providerName.ToLower() switch
        {
            "mercado_pago" => _serviceProvider.GetRequiredService<MercadoPagoProvider>(),
            "paypal" => _serviceProvider.GetRequiredService<PayPalProvider>(),
            "infinitepay" => _serviceProvider.GetRequiredService<InfinitePayProvider>(),
            _ => throw new UnsupportedPaymentProviderException(providerName)
        };
    }
}
```

---

## 5. BUSCA INTERATIVA & SUGESTÕES

### 5.1 Estratégia de Busca

**PostgreSQL Full-Text Search + Trigram (pg_trgm)**

```sql
-- Índices para busca
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search vector
CREATE TABLE products (
    ...
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('portuguese', name) || 
        to_tsvector('portuguese', description)
    ) STORED
);

CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_trigram_name ON products 
    USING GIN (name gin_trgm_ops);
```

### 5.2 Endpoints de Busca

```csharp
// GET /api/v1/search/products
public class SearchProductsQuery
{
    public string Query { get; set; }
    public Guid? CategoryId { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string SortBy { get; set; } = "relevance";  // relevance, price_asc, price_desc
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

[HttpGet("products")]
public async Task<IActionResult> SearchProducts([FromQuery] SearchProductsQuery query)
{
    var results = await _searchService.SearchProductsAsync(query);
    return Ok(results);
}

// GET /api/v1/search/suggest
public class SuggestQuery
{
    public string Query { get; set; }
    public int Limit { get; set; } = 5;
}

[HttpGet("suggest")]
public async Task<IActionResult> GetSuggestions([FromQuery] SuggestQuery query)
{
    var suggestions = await _searchService.GetSuggestionsAsync(query.Query, query.Limit);
    return Ok(suggestions);
}
```

### 5.3 Implementação - Service

```csharp
public class SearchService : ISearchService
{
    private readonly IProductRepository _productRepository;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SearchService> _logger;

    public async Task<SearchResultsDto> SearchProductsAsync(SearchProductsQuery query)
    {
        // Cache para queries frequentes
        var cacheKey = $"search_{query.Query}_{query.CategoryId}_{query.SortBy}";
        if (_cache.TryGetValue(cacheKey, out SearchResultsDto cached))
            return cached;

        var queryable = _productRepository.QueryActive();

        // 1. Full-text search
        if (!string.IsNullOrEmpty(query.Query))
        {
            queryable = queryable.Where(p =>
                EF.Functions.ToTsVector("portuguese", p.Name)
                    .Matches(EF.Functions.PlainToTsQuery("portuguese", query.Query))
                ||
                EF.Functions.ToTsVector("portuguese", p.Description)
                    .Matches(EF.Functions.PlainToTsQuery("portuguese", query.Query))
            );
        }

        // 2. Filtros
        if (query.CategoryId.HasValue)
        {
            queryable = queryable.Where(p => p.CategoryId == query.CategoryId.Value);
        }

        if (query.MinPrice.HasValue)
            queryable = queryable.Where(p => p.Price >= query.MinPrice.Value);

        if (query.MaxPrice.HasValue)
            queryable = queryable.Where(p => p.Price <= query.MaxPrice.Value);

        // 3. Ordenação
        queryable = query.SortBy switch
        {
            "price_asc" => queryable.OrderBy(p => p.Price),
            "price_desc" => queryable.OrderByDescending(p => p.Price),
            _ => queryable.OrderByDescending(p => 
                EF.Functions.ToTsVector("portuguese", p.Name)
                    .Rank(EF.Functions.PlainToTsQuery("portuguese", query.Query))
            )
        };

        // 4. Paginação
        var total = await queryable.CountAsync();
        var items = await queryable
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(p => new ProductSearchResultDto
            {
                Id = p.Id,
                Name = p.Name,
                Price = p.Price,
                Image = p.ProductImages.FirstOrDefault(i => i.IsMain).Url
            })
            .ToListAsync();

        var result = new SearchResultsDto
        {
            Items = items,
            Total = total,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalPages = (int)Math.Ceiling(total / (decimal)query.PageSize)
        };

        // Cache por 1 hora
        _cache.Set(cacheKey, result, TimeSpan.FromHours(1));
        return result;
    }

    public async Task<SuggestionsDto> GetSuggestionsAsync(string query, int limit)
    {
        if (string.IsNullOrEmpty(query) || query.Length < 2)
            return new SuggestionsDto { Products = new(), Categories = new() };

        var cacheKey = $"suggest_{query}";
        if (_cache.TryGetValue(cacheKey, out SuggestionsDto cached))
            return cached;

        // Busca com trigram (bem rápido para prefixos)
        var products = await _productRepository
            .QueryActive()
            .Where(p => EF.Functions.TrigramsWordSimilar(query, p.Name))
            .OrderByDescending(p => EF.Functions.TrigramsSimilarity(query, p.Name))
            .Take(limit)
            .Select(p => new SuggestionProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Price = p.Price
            })
            .ToListAsync();

        var categories = await _categoryRepository
            .Query()
            .Where(c => EF.Functions.TrigramsWordSimilar(query, c.Name))
            .OrderByDescending(c => EF.Functions.TrigramsSimilarity(query, c.Name))
            .Take(limit)
            .Select(c => new SuggestionCategoryDto
            {
                Id = c.Id,
                Name = c.Name
            })
            .ToListAsync();

        var result = new SuggestionsDto
        {
            Products = products,
            Categories = categories
        };

        _cache.Set(cacheKey, result, TimeSpan.FromHours(2));
        return result;
    }
}
```

---

## 6. SEGURANÇA & AUTENTICAÇÃO

### 6.1 Política de Senhas

```csharp
public class PasswordPolicy
{
    public int MinLength { get; set; } = 12;
    public bool RequireUppercase { get; set; } = true;
    public bool RequireLowercase { get; set; } = true;
    public bool RequireNumbers { get; set; } = true;
    public bool RequireSpecialChars { get; set; } = true;
    public string SpecialChars { get; set; } = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    public int ExpirationDays { get; set; } = 90;  // Exigir mudança a cada 90 dias
}

public class PasswordValidator
{
    private readonly PasswordPolicy _policy;

    public ValidationResult Validate(string password)
    {
        var errors = new List<string>();

        if (password.Length < _policy.MinLength)
            errors.Add($"Mínimo {_policy.MinLength} caracteres");

        if (_policy.RequireUppercase && !password.Any(char.IsUpper))
            errors.Add("Requer pelo menos uma letra maiúscula");

        if (_policy.RequireLowercase && !password.Any(char.IsLower))
            errors.Add("Requer pelo menos uma letra minúscula");

        if (_policy.RequireNumbers && !password.Any(char.IsDigit))
            errors.Add("Requer pelo menos um dígito");

        if (_policy.RequireSpecialChars && !password.Any(c => _policy.SpecialChars.Contains(c)))
            errors.Add($"Requer um dos caracteres especiais: {_policy.SpecialChars}");

        return new ValidationResult(errors.Count == 0, errors);
    }
}
```

### 6.2 Login com Rate Limit & Lockout

```csharp
public class LoginService : ILoginService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher<User> _hasher;
    private readonly IJwtTokenProvider _jwtProvider;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IDistributedCache _cache;
    private readonly IAuditService _auditService;
    private readonly ILogger<LoginService> _logger;

    private const int MaxLoginAttempts = 5;
    private const int LockoutDurationMinutes = 15;

    public async Task<LoginResult> LoginAsync(LoginRequest request, string ipAddress, string userAgent)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);
        
        // Verificar se existe attempt rate limit
        var attemptKey = $"login_attempts:{request.Email}";
        var attempts = await _cache.GetAsync(attemptKey);
        
        if (attempts >= MaxLoginAttempts)
        {
            _logger.LogWarning($"Login attempt exceeded for {request.Email}");
            throw new TooManyLoginAttemptsException();
        }

        if (user == null || !_hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Success)
        {
            // Incrementar tentativas
            await _cache.SetAsync(
                attemptKey,
                ++attempts,
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(LockoutDurationMinutes) }
            );

            _logger.LogWarning($"Failed login attempt for {request.Email} from {ipAddress}");
            throw new InvalidCredentialsException();
        }

        // Email não verificado
        if (!user.IsEmailVerified)
            throw new EmailNotVerifiedException();

        // Limpar tentativas
        await _cache.RemoveAsync(attemptKey);

        // Gerar tokens
        var accessToken = _jwtProvider.GenerateAccessToken(user);
        var refreshTokenEntity = await _refreshTokenService.CreateAsync(user, request.DeviceId, ipAddress, userAgent);

        // Audit log
        await _auditService.LogAsync(new AuditLog
        {
            UserId = user.Id,
            Action = "Login",
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        });

        return new LoginResult
        {
            AccessToken = accessToken,
            RefreshToken = refreshTokenEntity.Token,
            ExpiresIn = 3600  // 1 hora
        };
    }
}
```

### 6.3 Refresh Token com Rotação

```csharp
public class RefreshTokenService : IRefreshTokenService
{
    private readonly IRefreshTokenRepository _repository;
    private readonly IJwtTokenProvider _jwtProvider;
    private readonly ILogger<RefreshTokenService> _logger;

    public async Task<RefreshTokenDto> CreateAsync(
        User user,
        string deviceId,
        string ipAddress,
        string userAgent)
    {
        var tokenFamily = Guid.NewGuid();
        var token = GenerateSecureToken();

        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = token,
            RefreshTokenFamilyId = tokenFamily,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            DeviceId = deviceId,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            IsRevoked = false
        };

        await _repository.AddAsync(entity);
        await _repository.SaveChangesAsync();

        return new RefreshTokenDto { Token = token };
    }

    public async Task<TokenRefreshResult> RefreshAsync(
        string refreshToken,
        string deviceId,
        string ipAddress)
    {
        var tokenEntity = await _repository.GetByTokenAsync(refreshToken);

        if (tokenEntity == null || tokenEntity.IsRevoked || tokenEntity.ExpiresAt < DateTime.UtcNow)
        {
            // Potencial ataque: revogar toda a família
            if (tokenEntity?.RefreshTokenFamilyId != null)
            {
                await _repository.RevokeByFamilyAsync(tokenEntity.RefreshTokenFamilyId.Value);
                _logger.LogWarning($"Refresh token family revoked (possible token reuse): {tokenEntity.RefreshTokenFamilyId}");
            }
            
            throw new InvalidRefreshTokenException();
        }

        // Validar device ID
        if (tokenEntity.DeviceId != deviceId)
        {
            throw new DeviceMismatchException();
        }

        var user = await _userRepository.GetByIdAsync(tokenEntity.UserId);

        // Gerar novo access token
        var newAccessToken = _jwtProvider.GenerateAccessToken(user);

        // Rotacionar refresh token
        tokenEntity.IsRevoked = true;
        tokenEntity.RevokedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(tokenEntity);

        // Criar novo refresh token na mesma família
        var newRefreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = GenerateSecureToken(),
            RefreshTokenFamilyId = tokenEntity.RefreshTokenFamilyId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            DeviceId = deviceId,
            IpAddress = ipAddress,
            IsRevoked = false
        };

        await _repository.AddAsync(newRefreshToken);
        await _repository.SaveChangesAsync();

        return new TokenRefreshResult
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken.Token,
            ExpiresIn = 3600
        };
    }

    private string GenerateSecureToken()
    {
        using (var rng = new System.Security.Cryptography.RNGCryptoServiceProvider())
        {
            byte[] randomBytes = new byte[64];
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }
    }
}
```

### 6.4 Validação de Webhooks

```csharp
public class WebhookSignatureValidator
{
    public bool ValidateSignature(string payload, string signature, string secret, string algorithm = "sha256")
    {
        using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret)))
        {
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computedSignature = $"{algorithm}={Convert.ToHexString(hash).ToLower()}";
            
            // Constant-time comparison (previne timing attacks)
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(signature),
                Encoding.UTF8.GetBytes(computedSignature)
            );
        }
    }
}
```

### 6.5 Rate Limiting Middleware

```csharp
public class RateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDistributedCache _cache;
    private readonly ILogger<RateLimitMiddleware> _logger;

    private const int RequestsPerMinute = 60;

    public async Task InvokeAsync(HttpContext context)
    {
        var identifier = GetIdentifier(context);  // IP ou UserId
        var cacheKey = $"ratelimit:{identifier}";
        
        var requests = await _cache.GetAsync(cacheKey);
        var requestCount = int.TryParse(requests, out var count) ? count : 0;

        if (requestCount >= RequestsPerMinute)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/json";
            
            var response = new { error = "Too many requests. Try again later." };
            await context.Response.WriteAsJsonAsync(response);
            return;
        }

        requestCount++;
        await _cache.SetAsync(
            cacheKey,
            requestCount.ToString(),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1) }
        );

        await _next(context);
    }

    private string GetIdentifier(HttpContext context)
    {
        var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
            return userId;

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
```

### 6.6 Tratamento de Erros (OWASP)

```csharp
public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse();

        switch (exception)
        {
            case ValidationException ve:
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                response.Message = "Validation error";
                response.Errors = ve.Errors;
                break;

            case UnauthorizedAccessException:
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                response.Message = "Unauthorized";
                break;

            case InvalidOperationException:
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                response.Message = "Invalid operation";
                break;

            case ConcurrencyException:
                context.Response.StatusCode = StatusCodes.Status409Conflict;
                response.Message = "Resource was modified. Please refresh and try again.";
                break;

            default:
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                response.Message = "An internal error occurred.";  // Não expor detalhes
                break;
        }

        return context.Response.WriteAsJsonAsync(response);
    }
}

public class ErrorResponse
{
    public string Message { get; set; }
    public List<string> Errors { get; set; } = new();
    public string TraceId { get; set; }
}
```

---

## 7. VERSIONAMENTO DE CONTRATOS (DTOs)

### 7.1 Estrutura

```
Application/DTOs/
├── v1/
│   ├── Request/
│   │   ├── CreateProductRequest.cs
│   │   └── CreateOrderRequest.cs
│   └── Response/
│       ├── ProductDto.cs
│       └── OrderDto.cs
└── v2/
    ├── Request/
    │   ├── CreateProductRequest.cs  # Novos campos, breaking changes
    │   └── CreateOrderRequest.cs
    └── Response/
        ├── ProductDto.cs
        └── OrderDto.cs
```

### 7.2 Exemplo de Evolução

```csharp
// v1/Response/ProductDto.cs
public class ProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public string Description { get; set; }
}

// v2/Response/ProductDto.cs (breaking change)
public class ProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public string Description { get; set; }
    public List<string> Tags { get; set; }  // NOVO
    public List<ProductVariationDto> Variations { get; set; }  // NOVO
    // Nota: Clients v1 não receberão esses campos
}

// API/Controllers/ProductsController.cs
[ApiController]
[Route("api/v{version:apiVersion}/products")]
[ApiVersion("1.0")]
[ApiVersion("2.0")]
public class ProductsController : ControllerBase
{
    [HttpGet("{id}")]
    [MapToApiVersion("1.0")]
    public async Task<ActionResult<v1.ProductDto>> GetProductV1(Guid id)
    {
        var product = await _productService.GetByIdAsync(id);
        return Ok(_mapper.Map<v1.ProductDto>(product));
    }

    [HttpGet("{id}")]
    [MapToApiVersion("2.0")]
    public async Task<ActionResult<v2.ProductDto>> GetProductV2(Guid id)
    {
        var product = await _productService.GetByIdAsync(id);
        return Ok(_mapper.Map<v2.ProductDto>(product));
    }
}
```

---

## 8. DIAGRAMA DE FLUXOS CRÍTICOS

### 8.1 Fluxo de Checkout Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INICIATES CHECKOUT                                  │
│    GET /api/v1/checkout/summary (cartId)                    │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SYSTEM VALIDATES CART                                    │
│    - Estoque válido?                                        │
│    - Preços/promoções atualizados?                          │
│    - Cupom válido?                                          │
│    If ANY invalid → Error 422                               │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CREATE ORDER                                             │
│    POST /api/v1/orders/create                               │
│    Body: { cartId, couponCode?, shippingAddress, ... }      │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SYSTEM CREATES ORDER TRANSACTION                         │
│    BEGIN;                                                   │
│    - CREATE order (status: CREATED)                         │
│    - CREATE order_items (com snapshots)                     │
│    - DEDUCT from cart                                       │
│    - APPLY promotions/coupon (calc discount)                │
│    COMMIT;                                                  │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ORDER STATUS → PENDING_PAYMENT                           │
│    Publicar event: OrderCreatedEvent                        │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. INITIATE PAYMENT                                         │
│    POST /api/v1/payments/create (orderId, provider)         │
│    → Retorna paymentUrl                                     │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. USER REDIRECTS TO PAYMENT PROVIDER                       │
│    Browser: https://mercadopago.com/checkout/...            │
│    [User completes payment in provider interface]           │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. PROVIDER REDIRECTS BACK TO APP                           │
│    GET /payment/success?orderId=...&status=...              │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. WEBHOOK NOTIFICATION (ASYNC)                             │
│    POST /api/v1/webhooks/payment-status                     │
│    - Validate signature                                     │
│    - Check idempotency (externalId)                         │
│    - Update Payment status → COMPLETED                      │
│    - Update Order status → PAID                             │
│    - Publish PaymentConfirmedEvent                          │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. ASYNC PROCESSING (Event Handlers)                       │
│    - Send confirmation email                                │
│    - Update inventory/stock                                 │
│    - Trigger fulfillment system                             │
│    - Log to analytics                                       │
└─────────────────────────────────────────────────────────────┘
         ↓
ORDER COMPLETE ✓
```

---

## 9. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Modelagem EF Core completa (migrations)
- [ ] Autenticação com JWT + Refresh Token Rotation
- [ ] Email verification (token + reenvio)
- [ ] Password reset via email
- [ ] Rate limiting e login lockout
- [ ] Audit logging
- [ ] Carrinho resiliente com otimistic concurrency
- [ ] Idempotência em operações críticas
- [ ] Sistema de promoções e cupons
- [ ] Integração com 3+ providers de pagamento
- [ ] Webhooks com validação de assinatura
- [ ] Busca interativa (full-text + trigram)
- [ ] Sugestões em dropdown
- [ ] API versionada (v1, v2)
- [ ] Error handling padronizado (OWASP)
- [ ] Rate limiting middleware
- [ ] Documentação OpenAPI/Swagger
- [ ] Testes unitários (camadas Domain/Application)
- [ ] Testes de integração (DB, APIs)
- [ ] Testes E2E (checkout completo)

---

## 10. CONSIDERAÇÕES DE DEPLOYMENT

- **Database:** PostgreSQL em managed service (RDS/Azure PostgreSQL)
- **Caching:** Redis para sessions, rate limit, sugestões
- **Queue:** RabbitMQ/Azure Service Bus para processamento async (emails, webhooks)
- **Storage:** S3/Blob Storage para imagens
- **Monitoring:** Application Insights / Datadog
- **Security:** WAF, HTTPS obrigatório, CORS configurado
- **CI/CD:** GitHub Actions / Azure Pipelines

