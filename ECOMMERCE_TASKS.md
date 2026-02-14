# TASKS - SISTEMA E-COMMERCE "Loja de Produtos"

**Versão:** 1.0  
**Total de Tasks:** 87  
**Épicos:** 10

---

## 📌 ÉPICO 1: BACKEND BASE + DB + MIGRATIONS

### TASK 1.1 - Scaffold Projeto e Estrutura
**Objetivo:** Criar estrutura base da solução .NET com camadas

**Arquivos:**
```
EcommerceSolution/
├── src/
│   ├── Ecommerce.Domain/
│   │   ├── Ecommerce.Domain.csproj
│   │   └── Class.cs (delete me)
│   ├── Ecommerce.Application/
│   │   ├── Ecommerce.Application.csproj
│   │   └── Class.cs (delete me)
│   ├── Ecommerce.Infrastructure/
│   │   ├── Ecommerce.Infrastructure.csproj
│   │   └── Class.cs (delete me)
│   └── Ecommerce.API/
│       ├── Ecommerce.API.csproj
│       └── Program.cs
└── tests/
    ├── Ecommerce.Domain.Tests/Ecommerce.Domain.Tests.csproj
    ├── Ecommerce.Application.Tests/Ecommerce.Application.Tests.csproj
    └── Ecommerce.API.IntegrationTests/Ecommerce.API.IntegrationTests.csproj
```

**Passos:**
1. Criar solução: `dotnet new sln -n EcommerceSolution`
2. Criar projects:
   - `dotnet new classlib -n Ecommerce.Domain -o src/Ecommerce.Domain`
   - `dotnet new classlib -n Ecommerce.Application -o src/Ecommerce.Application`
   - `dotnet new classlib -n Ecommerce.Infrastructure -o src/Ecommerce.Infrastructure`
   - `dotnet new webapi -n Ecommerce.API -o src/Ecommerce.API`
3. Adicionar projects à solution
4. Configurar referências (csproj):
   - Application → Domain
   - Infrastructure → Domain, Application
   - API → Infrastructure, Application
5. Remover Class.cs gerados

**Critérios de Pronto:**
- ✓ Solução compila sem erros
- ✓ Estrutura de pastas conforme especificado
- ✓ Referências configuradas corretamente
- ✓ `dotnet build` executa sem warnings

---

### TASK 1.2 - Instalar NuGet Packages Base
**Objetivo:** Adicionar dependências core para todas as camadas

**Arquivos:**
```
src/Ecommerce.Domain/Ecommerce.Domain.csproj
src/Ecommerce.Application/Ecommerce.Application.csproj
src/Ecommerce.Infrastructure/Ecommerce.Infrastructure.csproj
src/Ecommerce.API/Ecommerce.API.csproj
```

**Passos:**
1. **Domain:**
   ```bash
   dotnet add src/Ecommerce.Domain package Microsoft.Extensions.Identity.Core
   ```

2. **Application:**
   ```bash
   dotnet add src/Ecommerce.Application package AutoMapper
   dotnet add src/Ecommerce.Application package FluentValidation
   dotnet add src/Ecommerce.Application package MediatR
   ```

3. **Infrastructure:**
   ```bash
   dotnet add src/Ecommerce.Infrastructure package Microsoft.EntityFrameworkCore
   dotnet add src/Ecommerce.Infrastructure package Microsoft.EntityFrameworkCore.PostgreSQL
   dotnet add src/Ecommerce.Infrastructure package Microsoft.Extensions.Caching.StackExchangeRedis
   dotnet add src/Ecommerce.Infrastructure package Serilog
   dotnet add src/Ecommerce.Infrastructure package Serilog.Sinks.Console
   dotnet add src/Ecommerce.Infrastructure package Serilog.Sinks.File
   ```

4. **API:**
   ```bash
   dotnet add src/Ecommerce.API package Asp.Versioning.Mvc.ApiExplorer
   dotnet add src/Ecommerce.API package Swashbuckle.AspNetCore
   dotnet add src/Ecommerce.API package IdentityModel
   ```

5. **Tests:**
   ```bash
   dotnet add tests/Ecommerce.Domain.Tests package xunit
   dotnet add tests/Ecommerce.Domain.Tests package Moq
   ```

**Critérios de Pronto:**
- ✓ Todos os packages instalados sem conflitos
- ✓ `dotnet build` sem warnings
- ✓ Versions.txt documentando todas as dependências

---

### TASK 1.3 - Criar DbContext e Configuração EF Core
**Objetivo:** Configurar EF Core com PostgreSQL e migrations

**Arquivos:**
```
src/Ecommerce.Infrastructure/Persistence/EcommerceDbContext.cs
src/Ecommerce.Infrastructure/Persistence/Configurations/EntityConfiguration.cs (base)
src/Ecommerce.API/appsettings.json
src/Ecommerce.API/appsettings.Development.json
```

**Passos:**
1. Criar `EcommerceDbContext` herdando de `DbContext`
2. Configurar connection string no `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=localhost;Port=5432;Database=ecommerce_dev;Username=postgres;Password=postgres"
     }
   }
   ```
3. Registrar DbContext no DI (`Program.cs`):
   ```csharp
   services.AddDbContext<EcommerceDbContext>(options =>
       options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"))
   );
   ```
4. Configurar Logging do EF Core em desenvolvimento
5. Habilitar migrations

**Critérios de Pronto:**
- ✓ DbContext criado e compila
- ✓ Connection string configurada
- ✓ `dotnet ef migrations list` executa sem erros
- ✓ Tests pode instanciar contexto (in-memory ou mocks)

---

### TASK 1.4 - Criar Domain Entities Base (User, Product, Category)
**Objetivo:** Definir entidades core sem relacionamentos ainda

**Arquivos:**
```
src/Ecommerce.Domain/Entities/User.cs
src/Ecommerce.Domain/Entities/Product.cs
src/Ecommerce.Domain/Entities/Category.cs
src/Ecommerce.Domain/ValueObjects/Email.cs
src/Ecommerce.Domain/Exceptions/DomainException.cs
```

**Passos:**
1. Criar `DomainException` base
2. Criar `Email` value object com validação
3. Criar `User` entity com propriedades:
   - Id (Guid)
   - Email (string unique)
   - PasswordHash
   - FullName
   - IsEmailVerified
   - CreatedAt, UpdatedAt
4. Criar `Product` entity:
   - Id, Sku (unique), Name, Description, Price, Stock
   - IsActive, CreatedAt
5. Criar `Category` entity:
   - Id, Name, Slug (unique), Description
   - ParentCategoryId (nullable)

**Critérios de Pronto:**
- ✓ Entidades compilam sem erros
- ✓ Propriedades conforme especificação
- ✓ Value objects com validação
- ✓ Exceções de domínio definidas

---

### TASK 1.5 - Criar Remaining Domain Entities
**Objetivo:** Completar todas as entidades do domínio

**Arquivos:**
```
src/Ecommerce.Domain/Entities/Cart.cs
src/Ecommerce.Domain/Entities/CartItem.cs
src/Ecommerce.Domain/Entities/Order.cs
src/Ecommerce.Domain/Entities/OrderItem.cs
src/Ecommerce.Domain/Entities/Payment.cs
src/Ecommerce.Domain/Entities/Promotion.cs
src/Ecommerce.Domain/Entities/Coupon.cs
src/Ecommerce.Domain/Entities/WebhookEvent.cs
src/Ecommerce.Domain/Entities/AuditLog.cs
src/Ecommerce.Domain/Entities/RefreshToken.cs
src/Ecommerce.Domain/Entities/EmailVerificationToken.cs
```

**Passos:**
1. Implementar cada entity com properties conforme ECOMMERCE_PLAN.md seção 2.2
2. Usar enums para status (OrderStatus.Pending, Payment.Provider, etc)
3. Adicionar métodos de domínio:
   - `Cart.AddItem(product, qty, price)`
   - `Order.SetTotal(subtotal, tax, discount)`
   - `Payment.MarkAsCompleted()`
4. Marcar `RowVersion` onde necessário (Cart, CartItem, Order)

**Critérios de Pronto:**
- ✓ Todas as 12 entidades implementadas
- ✓ Enums para status/tipos criados
- ✓ Métodos de domínio funccionais
- ✓ Sem warnings do compilador

---

### TASK 1.6 - Criar Migrations Iniciais
**Objetivo:** Gerar migrations para criar schema PostgreSQL

**Arquivos:**
```
src/Ecommerce.Infrastructure/Migrations/20260124000000_InitialCreate.cs
src/Ecommerce.Infrastructure/Migrations/EcommerceDbContextModelSnapshot.cs
```

**Passos:**
1. `dotnet ef migrations add InitialCreate -p src/Ecommerce.Infrastructure -s src/Ecommerce.API`
2. Revisar migration gerada
3. Adicionar configurações manuais em `Up()` se necessário:
   - Índices compostos
   - Constraints custom
   - Triggers de auditoria (opcional)
4. Testar migração: `dotnet ef database update`

**Critérios de Pronto:**
- ✓ Migration criada sem erros
- ✓ Banco PostgreSQL atualizado localmente
- ✓ Tables visíveis no pgAdmin ou CLI
- ✓ `dotnet ef migrations verify` sem issues

---

### TASK 1.7 - Criar Base Repository Pattern
**Objetivo:** Implementar padrão repository genérico

**Arquivos:**
```
src/Ecommerce.Domain/Interfaces/IRepository.cs
src/Ecommerce.Domain/Interfaces/IUnitOfWork.cs
src/Ecommerce.Infrastructure/Repositories/Repository.cs
src/Ecommerce.Infrastructure/Repositories/UnitOfWork.cs
```

**Passos:**
1. Definir `IRepository<TEntity>`:
   ```csharp
   public interface IRepository<TEntity> where TEntity : class
   {
       Task<TEntity> GetByIdAsync(Guid id);
       Task<IEnumerable<TEntity>> GetAllAsync();
       Task AddAsync(TEntity entity);
       Task UpdateAsync(TEntity entity);
       Task DeleteAsync(TEntity entity);
       IQueryable<TEntity> Query();
   }
   ```

2. Implementar `Repository<TEntity>` genérico
3. Definir `IUnitOfWork`
4. Implementar `UnitOfWork` com `SaveChangesAsync()`
5. Registrar no DI

**Critérios de Pronto:**
- ✓ CRUD operations testadas
- ✓ Query() retorna IQueryable
- ✓ SaveChangesAsync() funciona
- ✓ DI configurado

---

### TASK 1.8 - Criar EF Core Configurations (Fluent API)
**Objetivo:** Configurar relacionamentos e constraints via Fluent API

**Arquivos:**
```
src/Ecommerce.Infrastructure/Persistence/Configurations/UserConfiguration.cs
src/Ecommerce.Infrastructure/Persistence/Configurations/ProductConfiguration.cs
src/Ecommerce.Infrastructure/Persistence/Configurations/CartConfiguration.cs
src/Ecommerce.Infrastructure/Persistence/Configurations/OrderConfiguration.cs
src/Ecommerce.Infrastructure/Persistence/Configurations/PaymentConfiguration.cs
... (1 per entity)
```

**Passos:**
1. Criar classe base `IEntityTypeConfiguration<T>`
2. Para cada entidade, configurar:
   - Chave primária
   - Relacionamentos (HasOne, HasMany)
   - Índices
   - Constraints (unique, required, max length)
   - RowVersion para concorrência
3. Registrar todas em `DbContext.OnModelCreating()`

**Exemplo (UserConfiguration):**
```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(255);
        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasMany(u => u.RefreshTokens).WithOne().HasForeignKey("UserId");
    }
}
```

**Critérios de Pronto:**
- ✓ Todas as configurations implementadas
- ✓ Migrations geradas refletem configs
- ✓ Relacionamentos 1:N e N:M corretos
- ✓ Banco criado sem warnings

---

## 📌 ÉPICO 2: AUTH ROBUSTO

### TASK 2.1 - Implementar Password Hashing (Bcrypt)
**Objetivo:** Setup seguro de hash/verificação de senhas

**Arquivos:**
```
src/Ecommerce.Domain/Services/IPasswordHasher.cs
src/Ecommerce.Infrastructure/Services/BcryptPasswordHasher.cs
src/Ecommerce.Application/Validators/PasswordValidator.cs
```

**Passos:**
1. Instalar: `dotnet add src/Ecommerce.Infrastructure package BCrypt.Net-Next`
2. Implementar `IPasswordHasher`:
   ```csharp
   public interface IPasswordHasher
   {
       string Hash(string password);
       bool Verify(string password, string hash);
   }
   ```
3. Implementar com BCrypt (workfactor 12)
4. Criar `PasswordValidator` com policy:
   - Min 12 caracteres
   - Upper, lower, digits, special chars
5. Testar: hashing e verificação

**Critérios de Pronto:**
- ✓ Hash != password
- ✓ Verify(password, hash) retorna true
- ✓ Validator rejeita senhas fracas
- ✓ Unit tests para corner cases

---

### TASK 2.2 - Criar JWT Token Provider
**Objetivo:** Gerar e validar access tokens JWT

**Arquivos:**
```
src/Ecommerce.Domain/Interfaces/IJwtTokenProvider.cs
src/Ecommerce.Infrastructure/Services/JwtTokenProvider.cs
src/Ecommerce.API/appsettings.json (Jwt config)
```

**Passos:**
1. Instalar: `dotnet add src/Ecommerce.Infrastructure package System.IdentityModel.Tokens.Jwt`
2. Configurar em `appsettings.json`:
   ```json
   {
     "Jwt": {
       "Issuer": "https://ecommerce-api.com",
       "Audience": "ecommerce-client",
       "SecretKey": "your-super-secret-key-min-32-chars",
       "ExpirationMinutes": 60
     }
   }
   ```
3. Implementar `IJwtTokenProvider.GenerateAccessToken(userId, email)`
4. Adicionar claims padrão: sub, email, iat, exp
5. Testar decode e validação de signature

**Critérios de Pronto:**
- ✓ Token gerado com claims corretos
- ✓ Token decodificável
- ✓ Assinatura validada
- ✓ Unit tests

---

### TASK 2.3 - Implementar Refresh Token Rotation
**Objetivo:** Criar e validar refresh tokens com rotação de família

**Arquivos:**
```
src/Ecommerce.Domain/Interfaces/IRefreshTokenService.cs
src/Ecommerce.Infrastructure/Services/RefreshTokenService.cs
src/Ecommerce.Infrastructure/Repositories/RefreshTokenRepository.cs
```

**Passos:**
1. Criar migrations para RefreshToken com:
   - Token, ExpiresAt, IsRevoked, DeviceId, FamilyId
2. Implementar `IRefreshTokenService`:
   - `CreateAsync(userId, deviceId, ipAddress, userAgent)` → novo token
   - `RefreshAsync(token, deviceId)` → valida, rotaciona, retorna novo
   - `RevokeByFamilyAsync(familyId)` → revoga família inteira
3. Detector de reuso: se token usado 2x na mesma família → revoga tudo
4. Testar flow: create → refresh → refresh novamente

**Critérios de Pronto:**
- ✓ Token rotaciona na família
- ✓ DeviceId validado
- ✓ Reuso detectado e revogação disparada
- ✓ Expiração respeitada
- ✓ Tests unitários

---

### TASK 2.4 - Criar Email Verification Service
**Objetivo:** Sistema de verificação de email com tokens

**Arquivos:**
```
src/Ecommerce.Domain/Interfaces/IEmailService.cs
src/Ecommerce.Infrastructure/Services/EmailService.cs
src/Ecommerce.Infrastructure/Repositories/EmailVerificationTokenRepository.cs
src/Ecommerce.Application/Services/EmailVerificationService.cs
```

**Passos:**
1. Criar migration para `EmailVerificationToken`
2. Implementar `IEmailService` (abstração SMTP):
   - `SendVerificationEmailAsync(email, token)`
   - `SendPasswordResetAsync(email, token)`
3. Implementar `EmailVerificationService`:
   - `GenerateTokenAsync(userId)` → cria token com expiry 24h
   - `VerifyEmailAsync(token)` → valida e marca user como verified
   - `ResendTokenAsync(email)` → new token, old ones invalidated
4. Testar: token generation, expiry, resendings

**Critérios de Pronto:**
- ✓ Token gerado com 24h expiração
- ✓ Verify marca email como confirmed
- ✓ Token usado não reutilizável
- ✓ Resend invalida antigos
- ✓ Email builder templates (html)

---

### TASK 2.5 - Implementar Login com Rate Limiting
**Objetivo:** Autenticação com proteção contra brute force

**Arquivos:**
```
src/Ecommerce.Application/Services/LoginService.cs
src/Ecommerce.API/Endpoints/AuthController.cs
src/Ecommerce.API/Middleware/RateLimitMiddleware.cs
src/Ecommerce.Infrastructure/Services/RateLimitService.cs
```

**Passos:**
1. Implementar `LoginService.LoginAsync(email, password, deviceId, ipAddress)`:
   - Verificar rate limit (5 tentativas → 15min lockout)
   - Validar email/password
   - Verificar IsEmailVerified
   - Gerar access + refresh tokens
   - Log audit
2. Criar endpoint `POST /api/v1/auth/login`
3. Implementar `RateLimitMiddleware` para rate limit geral (Redis)
4. Testar: login bem-sucedido, senha incorreta, email não verificado

**Critérios de Pronto:**
- ✓ Login válido retorna tokens
- ✓ Rate limit ativo (5 tentativas)
- ✓ Lockout 15min após limite
- ✓ Audit log criado
- ✓ Tests de happy path + edge cases

---

### TASK 2.6 - Criar Password Reset Flow
**Objetivo:** Reset de senha seguro via email

**Arquivos:**
```
src/Ecommerce.Domain/Entities/PasswordResetToken.cs
src/Ecommerce.Application/Services/PasswordResetService.cs
src/Ecommerce.API/Endpoints/AuthController.cs (new endpoints)
```

**Passos:**
1. Criar entity `PasswordResetToken` (similar a EmailVerificationToken)
2. Criar migration
3. Implementar `PasswordResetService`:
   - `RequestResetAsync(email)` → gera token, envia email
   - `ResetPasswordAsync(token, newPassword)` → valida e muda senha
   - Cleanup de tokens expirados
4. Endpoints:
   - `POST /api/v1/auth/forgot-password` → { email }
   - `POST /api/v1/auth/reset-password` → { token, newPassword }
5. Testar: request, email enviado, reset válido, token expirado

**Critérios de Pronto:**
- ✓ Token enviado via email
- ✓ Reset com token válido funciona
- ✓ Senha antiga invalidada
- ✓ Token expirado rejetado
- ✓ Tests

---

### TASK 2.7 - Implementar Session Management por Device
**Objetivo:** Listar e encerrar sessões por dispositivo

**Arquivos:**
```
src/Ecommerce.Domain/Entities/UserSession.cs
src/Ecommerce.Application/Services/SessionManagementService.cs
src/Ecommerce.API/Endpoints/SessionController.cs
```

**Passos:**
1. Criar entity `UserSession`:
   - UserId, DeviceId, DeviceName, LastActivityAt, ExpiresAt
2. Criar migration
3. Implementar `SessionManagementService`:
   - `GetUserSessionsAsync(userId)` → listar
   - `EndSessionAsync(userId, deviceId)` → logout do device
   - `EndAllSessionsAsync(userId)` → logout everywhere
4. Endpoints:
   - `GET /api/v1/sessions` → listar sessões do user
   - `DELETE /api/v1/sessions/{deviceId}` → encerrar
   - `DELETE /api/v1/sessions` → encerrar todas
5. Testar: list, delete, cascade

**Critérios de Pronto:**
- ✓ Sessions listadas com info de device
- ✓ Delete por deviceId funciona
- ✓ Logout everywhere revoga tokens
- ✓ Tests

---

### TASK 2.8 - Criar Audit Logging
**Objetivo:** Rastrear ações de autenticação e operações sensíveis

**Arquivos:**
```
src/Ecommerce.Domain/Entities/AuditLog.cs
src/Ecommerce.Application/Interfaces/IAuditService.cs
src/Ecommerce.Infrastructure/Services/AuditService.cs
src/Ecommerce.API/Middleware/AuditLoggingMiddleware.cs
```

**Passos:**
1. Criar entity `AuditLog` (conforme PLAN seção 2.2)
2. Implementar `IAuditService`:
   - `LogAsync(action, entityType, entityId, oldValues, newValues, ipAddress, userAgent)`
3. Criar middleware que injeta audit context em cada request
4. LogAsync chamado de:
   - Login (ação: "Login", IP, UserAgent)
   - Password reset (ação: "PasswordReset")
   - Email verification (ação: "EmailVerified")
   - Admin actions (ação: "CreateProduct", "UpdatePromotion", etc)
5. Testes: log criado, dados salvos corretamente

**Critérios de Pronto:**
- ✓ Logs criados para key actions
- ✓ IP e UserAgent capturados
- ✓ Query de auditoria por user/action funciona
- ✓ Tests

---

### TASK 2.9 - Setup JWT Authentication Middleware
**Objetivo:** Proteger endpoints com autenticação JWT

**Arquivos:**
```
src/Ecommerce.API/Middleware/JwtAuthenticationMiddleware.cs
src/Ecommerce.API/Program.cs (registrar middleware)
src/Ecommerce.API/Attributes/AuthorizeAttribute.cs
```

**Passos:**
1. Adicionar JWT authentication ao pipeline:
   ```csharp
   builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
       .AddJwtBearer(options => {
           // Configurar validação de token
       });
   ```
2. Adicionar middleware no pipeline
3. Criar `[Authorize]` attribute (ou usar nativo)
4. Testar: protected endpoint com/sem token

**Critérios de Pronto:**
- ✓ Token inválido → 401
- ✓ Token válido → acesso
- ✓ Sem token em endpoint protegido → 401
- ✓ Claims extraídos corretamente

---

## 📌 ÉPICO 3: CATÁLOGO + CATEGORIAS + BUSCA

### TASK 3.1 - Criar Product Management Service
**Objetivo:** CRUD de produtos com validação

**Arquivos:**
```
src/Ecommerce.Application/DTOs/v1/Request/CreateProductRequest.cs
src/Ecommerce.Application/DTOs/v1/Response/ProductDto.cs
src/Ecommerce.Application/Services/ProductService.cs
src/Ecommerce.Application/Validators/CreateProductValidator.cs
src/Ecommerce.API/Endpoints/ProductController.cs
src/Ecommerce.Infrastructure/Repositories/ProductRepository.cs
```

**Passos:**
1. Criar DTOs:
   - `CreateProductRequest`: { sku, name, description, price, stock }
   - `ProductDto`: { id, sku, name, price, stock, isActive, images[] }
2. Criar validator com FluentValidation
3. Implementar `ProductService`:
   - `CreateAsync(request)` → cria product, audit log
   - `UpdateAsync(id, request)` → atualiza, audit log
   - `DeleteAsync(id)` → soft delete (isActive=false)
   - `GetByIdAsync(id)` → retorna ProductDto
   - `GetAllActiveAsync()` → pagination
4. Endpoints:
   - `POST /api/v1/products` → create [Admin]
   - `PUT /api/v1/products/{id}` → update [Admin]
   - `DELETE /api/v1/products/{id}` → delete [Admin]
   - `GET /api/v1/products/{id}` → public
   - `GET /api/v1/products?page=1&pageSize=20` → public
5. Tests: CRUD, validação, autorizações

**Critérios de Pronto:**
- ✓ CRUD funcionando
- ✓ Validações ativas
- ✓ Audit logs criados
- ✓ Admin only endpoints protegidos
- ✓ Tests unitários + E2E

---

### TASK 3.2 - Implementar Product Images
**Objetivo:** Upload e gerenciamento de múltiplas imagens

**Arquivos:**
```
src/Ecommerce.Domain/Entities/ProductImage.cs (se não existe)
src/Ecommerce.Application/Services/ProductImageService.cs
src/Ecommerce.Infrastructure/Services/FileStorageService.cs
src/Ecommerce.API/Endpoints/ProductImageController.cs
```

**Passos:**
1. Migração se necessário (ProductImage)
2. Implementar `FileStorageService` (abstração):
   - `UploadAsync(file, folder)` → URL
   - `DeleteAsync(url)` → remove
   - Usar S3 SDK ou abstrair para local storage
3. Implementar `ProductImageService`:
   - `AddImageAsync(productId, file, isMain)`
   - `RemoveImageAsync(imageId)`
   - `SetMainImageAsync(productId, imageId)`
   - `ReorderImagesAsync(productId, order[])`
4. Endpoints:
   - `POST /api/v1/products/{id}/images` → upload [Admin]
   - `DELETE /api/v1/products/images/{imageId}` → delete [Admin]
   - `PUT /api/v1/products/{id}/images/main` → set main [Admin]
5. Tests: upload, delete, ordering

**Critérios de Pronto:**
- ✓ Upload funciona
- ✓ Main image setável
- ✓ Order mantém ordenação
- ✓ Deletion remove arquivo
- ✓ Tests

---

### TASK 3.3 - Criar Category Management
**Objetivo:** CRUD de categorias com hierarquia

**Arquivos:**
```
src/Ecommerce.Application/DTOs/v1/Request/CreateCategoryRequest.cs
src/Ecommerce.Application/DTOs/v1/Response/CategoryDto.cs
src/Ecommerce.Application/Services/CategoryService.cs
src/Ecommerce.API/Endpoints/CategoryController.cs
src/Ecommerce.Infrastructure/Repositories/CategoryRepository.cs
```

**Passos:**
1. Criar DTOs:
   - `CreateCategoryRequest`: { name, slug, description, parentCategoryId }
   - `CategoryDto`: { id, name, slug, parentId, children[] }
2. Implementar `CategoryService`:
   - `CreateAsync(request)` → hierarquia ok
   - `UpdateAsync(id, request)` → prevenir loops (parent não pode ser child)
   - `DeleteAsync(id)` → soft delete, orphan children
   - `GetBySlugAsync(slug)` → com children recursivos
   - `GetAllActiveAsync()` → tree structure
3. Endpoints:
   - `POST /api/v1/categories` → create [Admin]
   - `PUT /api/v1/categories/{id}` → update [Admin]
   - `DELETE /api/v1/categories/{id}` → delete [Admin]
   - `GET /api/v1/categories` → public (tree)
   - `GET /api/v1/categories/{slug}` → public
4. Tests: CRUD, hierarquia, validação de loops

**Critérios de Pronto:**
- ✓ CRUD funcionando
- ✓ Hierarquia mantida
- ✓ Loop prevention
- ✓ Tree query eficiente
- ✓ Tests

---

### TASK 3.4 - Implementar PostgreSQL Full-Text Search
**Objetivo:** Setup de índices e busca FTS

**Arquivos:**
```
src/Ecommerce.Infrastructure/Persistence/Migrations/20260125000000_AddFullTextSearch.cs
src/Ecommerce.Infrastructure/Repositories/ProductRepository.cs (método SearchAsync)
```

**Passos:**
1. Criar migration:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ALTER TABLE products ADD COLUMN search_vector tsvector 
       GENERATED ALWAYS AS (
           to_tsvector('portuguese', name) || 
           to_tsvector('portuguese', description)
       ) STORED;
   CREATE INDEX idx_products_search ON products USING GIN(search_vector);
   CREATE INDEX idx_products_trigram ON products USING GIN(name gin_trgm_ops);
   ```
2. Implementar em `ProductRepository`:
   ```csharp
   public async Task<IEnumerable<Product>> SearchAsync(string query, int limit)
   {
       var tsQuery = EF.Functions.PlainToTsQuery("portuguese", query);
       return await _context.Products
           .Where(p => p.SearchVector.Matches(tsQuery))
           .Take(limit)
           .ToListAsync();
   }
   ```
3. Tests: search com query, performance

**Critérios de Pronto:**
- ✓ Extensão criada
- ✓ Índices criados
- ✓ Search retorna resultados
- ✓ Performance aceitável (< 50ms)

---

### TASK 3.5 - Criar Search Endpoint com Filtros
**Objetivo:** GET /search/products com categoria, preço, ordenação

**Arquivos:**
```
src/Ecommerce.Application/DTOs/v1/Request/SearchProductsQuery.cs
src/Ecommerce.Application/DTOs/v1/Response/SearchResultsDto.cs
src/Ecommerce.Application/Services/SearchService.cs
src/Ecommerce.API/Endpoints/SearchController.cs
```

**Passos:**
1. Criar DTOs:
   ```csharp
   public class SearchProductsQuery
   {
       public string Query { get; set; }
       public Guid? CategoryId { get; set; }
       public decimal? MinPrice { get; set; }
       public decimal? MaxPrice { get; set; }
       public string SortBy { get; set; } = "relevance";
       public int Page { get; set; } = 1;
       public int PageSize { get; set; } = 20;
   }
   ```

2. Implementar `SearchService.SearchProductsAsync(query)`:
   - Full-text search
   - Filtro por categoria
   - Filtro por faixa de preço
   - Sort por relevância/preço
   - Paginação

3. Endpoint:
   - `GET /api/v1/search/products?query=...&categoryId=...&minPrice=...`

4. Cache com Redis por 1 hora

5. Tests: search, filtros, sort, pagination

**Critérios de Pronto:**
- ✓ Search com query funciona
- ✓ Filtros aplicados corretamente
- ✓ Sort por relevância/preço
- ✓ Paginação ok
- ✓ Cache ativo
- ✓ Tests

---

### TASK 3.6 - Criar Suggestions Endpoint
**Objetivo:** GET /search/suggest com dropdown de produtos + categorias

**Arquivos:**
```
src/Ecommerce.Application/DTOs/v1/Response/SuggestionsDto.cs
src/Ecommerce.Application/Services/SearchService.cs (método GetSuggestionsAsync)
src/Ecommerce.API/Endpoints/SearchController.cs (GET suggest)
```

**Passos:**
1. Criar `SuggestionsDto`:
   ```csharp
   public class SuggestionsDto
   {
       public List<SuggestionProductDto> Products { get; set; }
       public List<SuggestionCategoryDto> Categories { get; set; }
   }
   ```

2. Implementar `GetSuggestionsAsync(query, limit=5)`:
   - Usar trigram similarity para suggestions (mais rápido que FTS)
   - Limite a 5 produtos + 5 categorias
   - Cache por 2h

3. Endpoint:
   - `GET /api/v1/search/suggest?query=...&limit=5`

4. Tests: query vazio, partial match, cache

**Critérios de Pronto:**
- ✓ Suggestions retorna produtos + categorias
- ✓ Limit respeitado
- ✓ Performance < 100ms
- ✓ Cache ativo
- ✓ Tests

---

## 📌 ÉPICO 4: CARRINHO RESILIENTE

### TASK 4.1 - Criar Cart Entity e Repository
**Objetivo:** Implementar carrinho com persistência

**Arquivos:**
```
src/Ecommerce.Domain/Entities/Cart.cs (se não existe)
src/Ecommerce.Domain/Entities/CartItem.cs (se não existe)
src/Ecommerce.Infrastructure/Repositories/CartRepository.cs
src/Ecommerce.Infrastructure/Persistence/Migrations/20260126000000_AddCartConcurrency.cs
```

**Passos:**
1. Garantir RowVersion em Cart e CartItem para optimistic concurrency
2. Implementar `CartRepository`:
   - `GetByIdAsync(cartId)` com includes (items, product)
   - `GetByUserIdAsync(userId)` ou null
   - `GetByGuestIdAsync(guestCartId)` ou null
   - `AddAsync(cart)`
   - `UpdateAsync(cart)` com RowVersion
3. Migration para adicionar indices
4. Tests: CRUD, concorrência

**Critérios de Pronto:**
- ✓ Cart persistida
- ✓ CartItems carregados
- ✓ RowVersion incrementado
- ✓ Tests

---

### TASK 4.2 - Implementar Idempotency Service
**Objetivo:** Armazenar resultados de operações para retry

**Arquivos:**
```
src/Ecommerce.Domain/Entities/CartIdempotencyKey.cs
src/Ecommerce.Application/Services/IdempotencyService.cs
src/Ecommerce.Infrastructure/Repositories/IdempotencyKeyRepository.cs
src/Ecommerce.Infrastructure/Persistence/Migrations/20260126000000_AddIdempotencyKeys.cs
```

**Passos:**
1. Entity: CartIdempotencyKey { id, cartId, operationKey (unique), response, createdAt }
2. Migração
3. Implementar `IIdempotencyService`:
   - `GetAsync(cartId, operationKey)` → cached response ou null
   - `StoreAsync(cartId, operationKey, response, ttl=24h)` → armazena
   - Cleanup de keys expiradas
4. Tests: store, retrieve, TTL

**Critérios de Pronto:**
- ✓ Key armazenada
- ✓ Retrieve funciona
- ✓ TTL respeitado
- ✓ Tests

---

### TASK 4.3 - Criar Cart Service (Add/Remove Items)
**Objetivo:** Operações de carrinho com idempotência

**Arquivos:**
```
src/Ecommerce.Application/Services/CartService.cs
src/Ecommerce.Application/DTOs/v1/Request/AddToCartRequest.cs
src/Ecommerce.Application/DTOs/v1/Response/CartDto.cs
src/Ecommerce.API/Endpoints/CartController.cs
```

**Passos:**
1. Criar DTOs:
   - `AddToCartRequest`: { productId, quantity, idempotencyKey }
   - `CartDto`: { id, items[], total, discount, taxAmount }

2. Implementar `CartService.AddItemAsync()`:
   - Verificar idempotência → retornar cached se existe
   - Validar estoque em tempo real
   - Recalcular preços (aplicar promoções ativas)
   - Atualizar cart com transação
   - Armazenar idempotency response
   - Return CartDto

3. Implementar `CartService.RemoveItemAsync()`:
   - Similar flow

4. Implementar `CartService.UpdateItemQuantityAsync()`:
   - Validar estoque
   - Atualizar com RowVersion check
   - Tratar concorrência (retornar 409 se conflict)

5. Endpoints:
   - `POST /api/v1/cart/items` → add
   - `DELETE /api/v1/cart/items/{itemId}` → remove
   - `PUT /api/v1/cart/items/{itemId}` → update qty

6. Tests: add, remove, update, concurrency, idempotência

**Critérios de Pronto:**
- ✓ Add/Remove/Update funcionam
- ✓ Idempotência ativa
- ✓ Concurrency check (RowVersion)
- ✓ Preços recalculados
- ✓ Tests

---

### TASK 4.4 - Implementar Guest Cart
**Objetivo:** Suportar carrinho anônimo com guestCartId

**Arquivos:**
```
src/Ecommerce.API/Middleware/GuestCartMiddleware.cs
src/Ecommerce.Application/Services/CartService.cs (GetOrCreateGuestCartAsync)
```

**Passos:**
1. Middleware que:
   - Verifica se user autenticado
   - Se não, gera/recupera guestCartId via cookie/header
   - Injeta no HttpContext
2. `CartService.GetOrCreateGuestCartAsync(guestCartId)`:
   - Se existe, retorna
   - Se não, cria nova com guestCartId
3. Tests: guest cart creation, persistence

**Critérios de Pronto:**
- ✓ GuestCartId criado e persistido
- ✓ Cookie/header mantém ID
- ✓ Cart loaded via guestCartId
- ✓ Tests

---

### TASK 4.5 - Implementar Cart Merge ao Login
**Objetivo:** Mesclar carrinho guest com user cart

**Arquivos:**
```
src/Ecommerce.Application/Services/CartService.cs (MergeGuestCartAsync)
src/Ecommerce.Application/Services/LoginService.cs (chamar merge)
```

**Passos:**
1. Implementar `CartService.MergeGuestCartAsync(userId, guestCartId)`:
   - Recuperar guest cart
   - Recuperar user cart (ou criar)
   - Para cada item do guest:
     - Se existe em user → somar quantidade
     - Se não existe → copiar
   - Validar estoque novamente (pode ter mudado)
   - Marcar guestCart como "merged"
   - Retornar merged cart

2. Chamar em `LoginService` após sucesso

3. Tests: merge, stock validation, conflicts

**Critérios de Pronto:**
- ✓ Guest items movidos para user cart
- ✓ Quantidades somadas
- ✓ Estoque revalidado
- ✓ GuestCart marcado como merged
- ✓ Tests

---

### TASK 4.6 - Criar Get Cart Endpoint
**Objetivo:** Recuperar carrinho do user/guest

**Arquivos:**
```
src/Ecommerce.API/Endpoints/CartController.cs (GET /cart)
```

**Passos:**
1. Endpoint `GET /api/v1/cart`:
   - Se autenticado: recuperar via userId
   - Se guest: recuperar via guestCartId
   - Recalcular totais (pode ter mudado preço/estoque)
   - Remover items com estoque 0
   - Retornar CartDto com warnings se necessário

2. Tests: user cart, guest cart, recalc

**Critérios de Pronto:**
- ✓ Retorna cartão do user/guest
- ✓ Preços atualizados
- ✓ Items sem estoque removidos
- ✓ Tests

---

## 📌 ÉPICO 5: PROMOÇÕES E CUPONS

### TASK 5.1 - Criar Promotion Entity e Service
**Objetivo:** Admin cria promoções (% ou R$)

**Arquivos:**
```
src/Ecommerce.Domain/Entities/Promotion.cs (se não existe)
src/Ecommerce.Application/Services/PromotionService.cs
src/Ecommerce.Application/DTOs/v1/Request/CreatePromotionRequest.cs
src/Ecommerce.API/Endpoints/PromotionController.cs
src/Ecommerce.Infrastructure/Repositories/PromotionRepository.cs
```

**Passos:**
1. Garantir Promotion entity com:
   - Type (percentage/fixed)
   - Value, MinOrder, MaxDiscount
   - ValidFrom, ValidUntil
   - Priority, AppliesToCategory/Product

2. Implementar `PromotionService`:
   - `CreateAsync(request)` [Admin]
   - `UpdateAsync(id, request)` [Admin]
   - `DeactivateAsync(id)` [Admin]
   - `GetActiveForProductAsync(productId)` → promo aplicável
   - `GetActiveForCategoryAsync(categoryId)` → promo aplicável

3. Endpoints:
   - `POST /api/v1/promotions` [Admin]
   - `PUT /api/v1/promotions/{id}` [Admin]
   - `DELETE /api/v1/promotions/{id}` [Admin]
   - `GET /api/v1/promotions?active=true` [Admin]

4. Tests: CRUD, aplicabilidade, validações

**Critérios de Pronto:**
- ✓ CRUD funcionando
- ✓ Validação de datas
- ✓ Aplicabilidade correta
- ✓ Tests

---

### TASK 5.2 - Criar Coupon Entity e Service
**Objetivo:** Admin cria cupons com código, desconto, limite

**Arquivos:**
```
src/Ecommerce.Domain/Entities/Coupon.cs (se não existe)
src/Ecommerce.Domain/Entities/CouponRedemption.cs (se não existe)
src/Ecommerce.Application/Services/CouponService.cs
src/Ecommerce.Application/DTOs/v1/Request/CreateCouponRequest.cs
src/Ecommerce.API/Endpoints/CouponController.cs
src/Ecommerce.Infrastructure/Repositories/CouponRepository.cs
```

**Passos:**
1. Entity Coupon:
   - Code (unique), Type, Value, MinOrder
   - MaxUses, MaxUsesPerUser
   - ValidFrom, ValidUntil, IsActive

2. Entity CouponRedemption:
   - CouponId, UserId, OrderId, UsedAt

3. Implementar `CouponService`:
   - `CreateAsync(request)` [Admin]
   - `ValidateAsync(code, userId, orderTotal)` → valid or error
   - `RedeemAsync(code, orderId, userId)` → cria redemption
   - `GetActiveAsync()` [Admin list]

4. Endpoints:
   - `POST /api/v1/coupons` [Admin]
   - `PUT /api/v1/coupons/{id}` [Admin]
   - `DELETE /api/v1/coupons/{id}` [Admin]
   - `POST /api/v1/coupons/validate` → { code, orderTotal }

5. Tests: CRUD, validation, redeem, limits

**Critérios de Pronto:**
- ✓ Coupon criado com validação
- ✓ Validation checks limits
- ✓ Redemption persisted
- ✓ Per-user limits enforced
- ✓ Tests

---

### TASK 5.3 - Integrar Promoções no Carrinho
**Objetivo:** Aplicar promoções automaticamente ao calcular total

**Arquivos:**
```
src/Ecommerce.Application/Services/PricingCalculationService.cs
src/Ecommerce.Application/Services/CartService.cs (chamar PricingCalculation)
```

**Passos:**
1. Criar `PricingCalculationService`:
   ```csharp
   public async Task<CartPricingDto> CalculateAsync(Cart cart)
   {
       decimal subtotal = 0;
       var applicablePromotions = new List<Promotion>();

       // 1. Calcular subtotal
       foreach (var item in cart.Items)
       {
           subtotal += item.Quantity * item.PriceSnapshot;
       }

       // 2. Encontrar promoções ativas
       for (var item in cart.Items)
       {
           var promos = await _promotionService.GetActiveForProductAsync(item.ProductId);
           applicablePromotions.AddRange(promos);
       }

       // 3. Calcular desconto (maior entre promoções)
       var discount = applicablePromotions
           .OrderByDescending(p => p.Priority)
           .First()
           ?.CalculateDiscount(subtotal) ?? 0;

       // 4. Calcular total
       var total = subtotal - discount;

       return new CartPricingDto
       {
           Subtotal = subtotal,
           DiscountAmount = discount,
           TaxAmount = CalculateTax(subtotal),
           Total = total
       };
   }
   ```

2. Chamar em `CartService.GetCart()` e `AddItem()`

3. Tests: single promo, multiple promos, no promo

**Critérios de Pronto:**
- ✓ Promoções aplicadas
- ✓ Maior desconto escolhido
- ✓ Preços recalculados
- ✓ Tests

---

### TASK 5.4 - Integrar Cupons no Checkout
**Objetivo:** Aplicar cupom ao criar order

**Arquivos:**
```
src/Ecommerce.Application/Services/CouponService.cs (ValidateAsync)
src/Ecommerce.Application/Services/OrderService.cs (chamar validate)
```

**Passos:**
1. Validação em `CouponService.ValidateAsync(code, userId, orderTotal)`:
   - Cupom existe e ativo?
   - Data válida?
   - Limite total não atingido?
   - Limite por user não atingido?
   - Valor mínimo atingido?

2. Ao criar order:
   - `OrderService.CreateAsync(cartId, couponCode)`
   - Validar cupom
   - Aplicar desconto ao total
   - Criar `CouponRedemption`

3. Tests: valid coupon, expired, limit reached, invalid code

**Critérios de Pronto:**
- ✓ Cupom validado
- ✓ Desconto aplicado
- ✓ Redemption criada
- ✓ Limites enforced
- ✓ Tests

---

## 📌 ÉPICO 6: PEDIDOS + CHECKOUT

### TASK 6.1 - Criar Order Entity e Service (Básico)
**Objetivo:** Criar pedidos com items snapshot

**Arquivos:**
```
src/Ecommerce.Domain/Entities/Order.cs (se não existe)
src/Ecommerce.Domain/Entities/OrderItem.cs (se não existe)
src/Ecommerce.Application/Services/OrderService.cs
src/Ecommerce.Application/DTOs/v1/Request/CreateOrderRequest.cs
src/Ecommerce.Application/DTOs/v1/Response/OrderDto.cs
src/Ecommerce.API/Endpoints/OrderController.cs
```

**Passos:**
1. Entity Order:
   - UserId, Status (CREATED, PENDING_PAYMENT, PAID, FAILED, SHIPPED, DELIVERED, CANCELED)
   - SubtotalAmount, TaxAmount, DiscountAmount, TotalAmount
   - RowVersion (concurrency)

2. Entity OrderItem:
   - OrderId, ProductId, Quantity, UnitPrice
   - NameSnapshot, SkuSnapshot (para auditoria)

3. Implementar `OrderService.CreateAsync()`:
   - Validar cart não vazio
   - Validar user email verificado
   - Criar transaction
   - Snapshot items do cart
   - Aplicar cupom se fornecido
   - Calcular totals
   - Criar Order e OrderItems
   - Limpar cart
   - Audit log
   - Return OrderDto

4. Endpoints:
   - `POST /api/v1/orders` → { cartId, couponCode?, shippingAddress }
   - `GET /api/v1/orders/{id}` → public (own only)
   - `GET /api/v1/orders?page=1` → user's orders

5. Tests: create, get, list, validations

**Critérios de Pronto:**
- ✓ Order criada com items
- ✓ Snapshots armazenados
- ✓ Cart limpo
- ✓ Status inicial CREATED
- ✓ Tests

---

### TASK 6.2 - Implementar Order State Machine
**Objetivo:** Transições validadas de status

**Arquivos:**
```
src/Ecommerce.Domain/ValueObjects/OrderStatus.cs (enum ou class)
src/Ecommerce.Application/Services/OrderStateService.cs
```

**Passos:**
1. Definir transições válidas:
   - CREATED → PENDING_PAYMENT
   - PENDING_PAYMENT → PAID | FAILED
   - PAID → SHIPPED
   - SHIPPED → DELIVERED
   - Qualquer → CANCELED (se não DELIVERED)

2. Implementar `OrderStateService.TransitionAsync(orderId, newStatus)`:
   - Validar transição
   - Atualizar status
   - Audit log
   - Publicar event

3. Tests: valid transitions, invalid transitions

**Critérios de Pronto:**
- ✓ Transições validadas
- ✓ Invalid rejeita
- ✓ Events publicados
- ✓ Tests

---

### TASK 6.3 - Criar Checkout Endpoint
**Objetivo:** POST /checkout que cria order + payment

**Arquivos:**
```
src/Ecommerce.API/Endpoints/CheckoutController.cs
src/Ecommerce.Application/Services/CheckoutService.cs
```

**Passos:**
1. Criar `CheckoutService.CheckoutAsync(cartId, provider, shippingAddress, couponCode)`:
   - Validar cart
   - Criar order
   - Transicionar para PENDING_PAYMENT
   - Initiate payment com provider
   - Return paymentUrl

2. Endpoint `POST /api/v1/checkout`:
   ```json
   {
       "cartId": "...",
       "provider": "mercado_pago",
       "shippingAddress": {...},
       "couponCode": "SUMMER20"
   }
   ```

3. Response:
   ```json
   {
       "orderId": "...",
       "paymentUrl": "https://mercadopago.com/...",
       "redirectTo": "https://checkout.mercadopago.com"
   }
   ```

4. Tests: checkout flow, validations, error cases

**Critérios de Pronto:**
- ✓ Order criada
- ✓ Payment iniciado
- ✓ Payment URL retornado
- ✓ Tests

---

### TASK 6.4 - Implementar Order Listing para Admin
**Objetivo:** Admin lista orders com filtros

**Arquivos:**
```
src/Ecommerce.API/Endpoints/AdminOrderController.cs
src/Ecommerce.Application/DTOs/v1/Response/AdminOrderDto.cs
```

**Passos:**
1. Endpoint `GET /api/v1/admin/orders`:
   - Query params: status, userId, dateFrom, dateTo, page
   - Retorna lista paginada
   - Apenas admin

2. Response com user info, items, totals

3. Tests: filtering, pagination, authorization

**Critérios de Pronto:**
- ✓ Listing funciona
- ✓ Filtros aplicados
- ✓ Admin only
- ✓ Tests

---

## 📌 ÉPICO 7: PAGAMENTOS

### TASK 7.1 - Criar Payment Provider Abstraction
**Objetivo:** Interface para diferentes provedores

**Arquivos:**
```
src/Ecommerce.Domain/Interfaces/IPaymentProvider.cs
src/Ecommerce.Domain/ValueObjects/PaymentCreationResult.cs
src/Ecommerce.Domain/ValueObjects/PaymentStatusResult.cs
src/Ecommerce.Application/Services/PaymentProviderFactory.cs
```

**Passos:**
1. Definir `IPaymentProvider`:
   ```csharp
   public interface IPaymentProvider
   {
       Task<PaymentCreationResult> CreatePaymentAsync(Order order, PaymentConfig config);
       Task<PaymentStatusResult> GetPaymentStatusAsync(string providerPaymentId);
       Task<bool> ValidateWebhookAsync(string payload, string signature);
   }
   ```

2. `PaymentCreationResult`:
   - ProviderPaymentId, PaymentUrl, SandboxUrl

3. `PaymentStatusResult`:
   - Status (pending, completed, failed), Amount, ErrorMessage

4. Implementar Factory:
   ```csharp
   public class PaymentProviderFactory
   {
       public IPaymentProvider GetProvider(string name) => name switch
       {
           "mercado_pago" => _sp.GetRequiredService<MercadoPagoProvider>(),
           "paypal" => _sp.GetRequiredService<PayPalProvider>(),
           "infinitepay" => _sp.GetRequiredService<InfinitePayProvider>(),
           _ => throw new UnsupportedProviderException()
       };
   }
   ```

5. Tests: factory returns correct providers

**Critérios de Pronto:**
- ✓ Interface definida
- ✓ Factory funciona
- ✓ Tests

---

### TASK 7.2 - Implementar Mercado Pago Provider
**Objetivo:** Integração com Mercado Pago

**Arquivos:**
```
src/Ecommerce.Infrastructure/ExternalServices/MercadoPagoProvider.cs
src/Ecommerce.API/appsettings.json (Mercado Pago config)
```

**Passos:**
1. Instalar: `dotnet add src/Ecommerce.Infrastructure package MercadoPago.Client`
2. Configurar credenciais em appsettings
3. Implementar `MercadoPagoProvider`:
   - `CreatePaymentAsync()`: criar preference, retornar URL
   - `GetPaymentStatusAsync()`: query payment status
   - `ValidateWebhookAsync()`: validar signature
4. Tests: create payment, validate webhook, mocked HTTP

**Critérios de Pronto:**
- ✓ Payment criado
- ✓ URL válido
- ✓ Webhook validado
- ✓ Tests

---

### TASK 7.3 - Implementar PayPal Provider
**Objetivo:** Integração com PayPal

**Arquivos:**
```
src/Ecommerce.Infrastructure/ExternalServices/PayPalProvider.cs
src/Ecommerce.API/appsettings.json (PayPal config)
```

**Passos:**
1. Instalar PayPal SDK
2. Configurar credenciais
3. Implementar provider
4. Tests

**Critérios de Pronto:**
- ✓ Similar a Mercado Pago
- ✓ Tests

---

### TASK 7.4 - Implementar InfinitePay Provider
**Objetivo:** Integração com InfinitePay

**Arquivos:**
```
src/Ecommerce.Infrastructure/ExternalServices/InfinitePayProvider.cs
src/Ecommerce.API/appsettings.json (InfinitePay config)
```

**Passos:**
1. Setup credentials
2. Implementar provider
3. Tests

**Critérios de Pronto:**
- ✓ Similar a Mercado Pago
- ✓ Tests

---

### TASK 7.5 - Criar Payment Service e Entity
**Objetivo:** Rastrear pagamentos e integrações

**Arquivos:**
```
src/Ecommerce.Domain/Entities/Payment.cs (se não existe)
src/Ecommerce.Application/Services/PaymentService.cs
src/Ecommerce.Infrastructure/Repositories/PaymentRepository.cs
```

**Passos:**
1. Entity Payment:
   - OrderId, Provider, ProviderPaymentId, Status, Amount, Method
   - CreatedAt, UpdatedAt

2. Implementar `PaymentService`:
   - `InitiatePaymentAsync(orderId, provider)` → cria Payment, chama provider
   - `GetPaymentStatusAsync(paymentId)` → query provider

3. Tests: initiate, status query

**Critérios de Pronto:**
- ✓ Payment criado
- ✓ Provider chamado
- ✓ Status recuperado
- ✓ Tests

---

## 📌 ÉPICO 8: WEBHOOKS + IDEMPOTÊNCIA + AUDITORIA

### TASK 8.1 - Criar Webhook Endpoint Base
**Objetivo:** POST /webhooks/payment-status que processa webhooks

**Arquivos:**
```
src/Ecommerce.API/Endpoints/WebhookController.cs
src/Ecommerce.Application/Services/WebhookHandlerService.cs
```

**Passos:**
1. Endpoint `POST /api/v1/webhooks/payment-status`:
   - Aceita POST de providers
   - Extrai provider, payload, signature
   - Delegado ao handler

2. Implementar `WebhookHandlerService`:
   - Validar signature por provider
   - Verificar idempotência (externalId)
   - Processar pagamento
   - Atualizar order status

3. Tests: valid webhook, invalid signature, idempotência

**Critérios de Pronto:**
- ✓ Webhook recebido
- ✓ Signature validada
- ✓ Processado uma única vez
- ✓ Tests

---

### TASK 8.2 - Criar WebhookEvent Entity e Idempotência
**Objetivo:** Armazenar webhooks e prevenir duplicatas

**Arquivos:**
```
src/Ecommerce.Domain/Entities/WebhookEvent.cs (se não existe)
src/Ecommerce.Infrastructure/Repositories/WebhookEventRepository.cs
src/Ecommerce.Application/Services/WebhookHandlerService.cs (usar entity)
```

**Passos:**
1. Entity WebhookEvent:
   - Provider, EventType, ExternalId (unique), Payload
   - IsProcessed, ProcessedAt, RetryCount, LastError

2. Logic em WebhookHandlerService:
   ```csharp
   var existing = await _webhookRepository.GetByExternalIdAsync(externalId);
   if (existing?.IsProcessed ?? false)
       return true; // Já processado, retornar sucesso silenciosamente

   if (existing == null)
       existing = new WebhookEvent { ExternalId = externalId, ... };

   try {
       // Processar pagamento
       existing.IsProcessed = true;
       existing.ProcessedAt = DateTime.UtcNow;
   } catch (Exception ex) {
       existing.RetryCount++;
       existing.LastError = ex.Message;
   }

   await _webhookRepository.UpdateAsync(existing);
   ```

3. Tests: duplicate detection, retry logic

**Critérios de Pronto:**
- ✓ Webhook armazenado
- ✓ Duplicata detectada
- ✓ Processamento uma única vez
- ✓ Retry tracking
- ✓ Tests

---

### TASK 8.3 - Implementar Signature Validation (HMAC)
**Objetivo:** Validar assinaturas de webhooks

**Arquivos:**
```
src/Ecommerce.Infrastructure/Services/WebhookSignatureValidator.cs
src/Ecommerce.Application/Services/WebhookHandlerService.cs (usar validator)
```

**Passos:**
1. Implementar `WebhookSignatureValidator`:
   ```csharp
   public bool ValidateSignature(string payload, string signature, string secret)
   {
       using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret)))
       {
           var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
           var computed = Convert.ToHexString(hash).ToLower();
           return CryptographicOperations.FixedTimeEquals(
               Encoding.UTF8.GetBytes(signature),
               Encoding.UTF8.GetBytes(computed)
           );
       }
   }
   ```

2. Usar em WebhookHandlerService para validar antes de processar

3. Tests: valid signature, tampered payload, constant-time comparison

**Critérios de Pronto:**
- ✓ Signature validada
- ✓ Tampered payload rejeitado
- ✓ Timing attack protected
- ✓ Tests

---

### TASK 8.4 - Implementar Payment Webhook Handler
**Objetivo:** Atualizar order status quando webhook chega

**Arquivos:**
```
src/Ecommerce.Application/Services/WebhookHandlerService.cs (método HandlePaymentAsync)
```

**Passos:**
1. Ao receber webhook de pagamento:
   - Recuperar Payment via providerPaymentId
   - Recuperar Order via payment
   - Validar status do webhook (approved/rejected/etc)
   - Atualizar payment.status
   - Transicionar order.status (PENDING_PAYMENT → PAID ou FAILED)
   - Publicar event: PaymentConfirmedEvent ou PaymentFailedEvent
   - Audit log

2. Tests: payment approved, payment rejected, status transitions

**Critérios de Pronto:**
- ✓ Order status atualizado
- ✓ Payment status atualizado
- ✓ Events publicados
- ✓ Audit log criado
- ✓ Tests

---

### TASK 8.5 - Implementar Async Event Publishing
**Objetivo:** Disparar eventos após payment confirmation

**Arquivos:**
```
src/Ecommerce.Domain/Events/PaymentConfirmedEvent.cs
src/Ecommerce.Domain/Events/PaymentFailedEvent.cs
src/Ecommerce.Application/EventHandlers/OnPaymentConfirmedHandler.cs
src/Ecommerce.Infrastructure/Services/EventPublisher.cs
```

**Passos:**
1. Definir domain events
2. Implementar event publisher (MediatR ou manual)
3. Handlers:
   - `OnPaymentConfirmedHandler`: send confirmation email, update inventory
   - `OnPaymentFailedHandler`: send failure email, release cart lock
4. Publish em `WebhookHandlerService` após atualizar payment
5. Tests: events publicados, handlers executados

**Critérios de Pronto:**
- ✓ Events publicados
- ✓ Handlers executados
- ✓ Async processing
- ✓ Tests

---

## 📌 ÉPICO 9: ADMIN PANEL

### TASK 9.1 - Criar Role-Based Access Control (RBAC)
**Objetivo:** Suportar Admin e User roles

**Arquivos:**
```
src/Ecommerce.Domain/Entities/Role.cs
src/Ecommerce.Domain/Entities/UserRole.cs
src/Ecommerce.Infrastructure/Repositories/RoleRepository.cs
src/Ecommerce.API/Middleware/RoleAuthenticationMiddleware.cs
src/Ecommerce.API/Attributes/AuthorizeRoleAttribute.cs
```

**Passos:**
1. Entity Role: { id, name, description }
2. Entity UserRole: { userId, roleId } (N:N)
3. Migrations
4. Seed roles: Admin, Customer
5. Middleware que injeta roles em claims
6. `[AuthorizeRole("Admin")]` attribute
7. Tests: role checking, authorization

**Critérios de Pronto:**
- ✓ Roles criadas
- ✓ Users tem roles
- ✓ Middleware injeta roles
- ✓ Endpoints protegidos
- ✓ Tests

---

### TASK 9.2 - Criar Admin Product Management Endpoints
**Objetivo:** Admin CRUD de produtos

**Arquivos:**
```
src/Ecommerce.API/Endpoints/AdminProductController.cs
src/Ecommerce.Application/DTOs/v1/Request/AdminCreateProductRequest.cs
```

**Passos:**
1. Endpoints (já parcialmente feitos em TASK 3.1):
   - `POST /api/v1/admin/products` [Admin]
   - `PUT /api/v1/admin/products/{id}` [Admin]
   - `DELETE /api/v1/admin/products/{id}` [Admin]
   - `GET /api/v1/admin/products` [Admin] (listing com filtros)

2. Features:
   - Batch operations (importar produtos)
   - Preço, estoque, ativação

3. Tests: CRUD, authorization, batch

**Critérios de Pronto:**
- ✓ CRUD funciona
- ✓ Admin only
- ✓ Audit logs
- ✓ Tests

---

### TASK 9.3 - Criar Admin Category Management
**Objetivo:** Admin CRUD de categorias

**Arquivos:**
```
src/Ecommerce.API/Endpoints/AdminCategoryController.cs
```

**Passos:**
1. Similar a TASK 3.3 mas com endpoints admin
2. Endpoints:
   - `POST /api/v1/admin/categories` [Admin]
   - `PUT /api/v1/admin/categories/{id}` [Admin]
   - `DELETE /api/v1/admin/categories/{id}` [Admin]

3. Tests

**Critérios de Pronto:**
- ✓ CRUD admin
- ✓ Tests

---

### TASK 9.4 - Criar Admin Promotion Management
**Objetivo:** Admin CRUD de promoções

**Arquivos:**
```
src/Ecommerce.API/Endpoints/AdminPromotionController.cs
```

**Passos:**
1. Endpoints:
   - `POST /api/v1/admin/promotions` [Admin]
   - `PUT /api/v1/admin/promotions/{id}` [Admin]
   - `DELETE /api/v1/admin/promotions/{id}` [Admin]
   - `GET /api/v1/admin/promotions` [Admin]

2. Features: preview de desconto, validação de datas

3. Tests

**Critérios de Pronto:**
- ✓ CRUD admin
- ✓ Preview funciona
- ✓ Tests

---

### TASK 9.5 - Criar Admin Coupon Management
**Objetivo:** Admin CRUD de cupons

**Arquivos:**
```
src/Ecommerce.API/Endpoints/AdminCouponController.cs
```

**Passos:**
1. Endpoints:
   - `POST /api/v1/admin/coupons` [Admin]
   - `PUT /api/v1/admin/coupons/{id}` [Admin]
   - `DELETE /api/v1/admin/coupons/{id}` [Admin]
   - `GET /api/v1/admin/coupons` [Admin] (com usage stats)

2. Features: ver uso total, por usuário

3. Tests

**Critérios de Pronto:**
- ✓ CRUD admin
- ✓ Usage tracking
- ✓ Tests

---

### TASK 9.6 - Criar Admin Order Management
**Objetivo:** Admin visualiza e gerencia pedidos

**Arquivos:**
```
src/Ecommerce.API/Endpoints/AdminOrderController.cs (expandir)
```

**Passos:**
1. Endpoints:
   - `GET /api/v1/admin/orders` [Admin] (listing com filtros)
   - `GET /api/v1/admin/orders/{id}` [Admin]
   - `PUT /api/v1/admin/orders/{id}/status` [Admin] (transicionar status)
   - `GET /api/v1/admin/orders/{id}/timeline` [Admin] (histórico de mudanças)

2. Features: 
   - Filtro por status, user, data range
   - Cancelamento de orders
   - Reembolso manual

3. Tests

**Critérios de Pronto:**
- ✓ Listing com filtros
- ✓ Detail view
- ✓ Status updates
- ✓ Tests

---

### TASK 9.7 - Criar Admin Dashboard (Estatísticas)
**Objetivo:** Dashboard com KPIs

**Arquivos:**
```
src/Ecommerce.API/Endpoints/AdminDashboardController.cs
src/Ecommerce.Application/Services/DashboardService.cs
src/Ecommerce.Application/DTOs/v1/Response/DashboardStatsDto.cs
```

**Passos:**
1. Endpoint `GET /api/v1/admin/dashboard/stats` [Admin]:
   - Total orders (dia, semana, mês)
   - Revenue
   - Conversion rate
   - Top produtos
   - Cupons mais usados
   - Payment methods breakdown

2. Implementar `DashboardService` com queries otimizadas

3. Cache por 1 hora

4. Tests

**Critérios de Pronto:**
- ✓ Stats calculados
- ✓ Cache ativo
- ✓ Tests

---

## 📌 ÉPICO 10: OBSERVABILIDADE + TESTES

### TASK 10.1 - Setup Logging com Serilog
**Objetivo:** Logging estruturado em todas as camadas

**Arquivos:**
```
src/Ecommerce.API/Program.cs (configurar Serilog)
appsettings.json (logging config)
appsettings.Development.json
```

**Passos:**
1. Instalar: `dotnet add src/Ecommerce.API package Serilog.AspNetCore`
2. Configurar em `Program.cs`:
   ```csharp
   Log.Logger = new LoggerConfiguration()
       .MinimumLevel.Debug()
       .WriteTo.Console()
       .WriteTo.File("logs/app-.txt", rollingInterval: RollingInterval.Day)
       .CreateLogger();
   ```
3. Usar `ILogger<T>` em services
4. Tests: log messages appear

**Critérios de Pronto:**
- ✓ Logs estruturados
- ✓ Console e file sinks
- ✓ Níveis configuráveis
- ✓ Tests

---

### TASK 10.2 - Setup Application Insights (APM)
**Objetivo:** Monitoramento de performance e erros

**Arquivos:**
```
src/Ecommerce.API/Program.cs (registrar App Insights)
appsettings.json (connection string)
```

**Passos:**
1. Instalar: `dotnet add src/Ecommerce.API package Microsoft.ApplicationInsights.AspNetCore`
2. Configurar connection string
3. Registrar no `Program.cs`
4. Automatic exception tracking
5. Custom metrics (opcional)

**Critérios de Pronto:**
- ✓ App Insights configurado
- ✓ Telemetria enviada
- ✓ Erros tracked

---

### TASK 10.3 - Criar Health Check Endpoints
**Objetivo:** Verificar saúde da aplicação

**Arquivos:**
```
src/Ecommerce.API/Program.cs (AddHealthChecks)
src/Ecommerce.API/Endpoints/HealthController.cs
```

**Passos:**
1. Instalar: `dotnet add src/Ecommerce.API package AspNetCore.HealthChecks.PostgreSQL`
2. Registrar checks:
   - Database connectivity
   - Redis connectivity
   - External APIs (payment providers)
3. Endpoint `GET /health` → { status, checks[] }
4. Tests

**Critérios de Pronto:**
- ✓ Health checks criados
- ✓ Endpoint retorna status
- ✓ Tests

---

### TASK 10.4 - Criar Unit Tests para Domain e Application
**Objetivo:** Testes de lógica de negócio

**Arquivos:**
```
tests/Ecommerce.Domain.Tests/Entities/CartTests.cs
tests/Ecommerce.Domain.Tests/Services/PasswordValidatorTests.cs
tests/Ecommerce.Application.Tests/Services/CartServiceTests.cs
tests/Ecommerce.Application.Tests/Services/OrderServiceTests.cs
```

**Passos:**
1. Testes para cada service/entity com xUnit
2. Mock de dependencies
3. Cobertura mínima: 80%

Exemplos:
- CartService.AddItem() com item novo, duplicado, sem estoque
- OrderService.Create() com cupom válido, inválido
- PasswordValidator com senhas fracas
- RefreshTokenService com rotação, reuso

4. CI/CD rodando tests

**Critérios de Pronto:**
- ✓ +50 unit tests
- ✓ 80%+ coverage
- ✓ CI executa tests

---

### TASK 10.5 - Criar Integration Tests
**Objetivo:** Testes E2E de flows críticos

**Arquivos:**
```
tests/Ecommerce.API.IntegrationTests/AuthFlowTests.cs
tests/Ecommerce.API.IntegrationTests/CheckoutFlowTests.cs
tests/Ecommerce.API.IntegrationTests/WebhookTests.cs
```

**Passos:**
1. Setup `WebApplicationFactory<Program>` para testing
2. In-memory database ou test container PostgreSQL
3. Testes:
   - **Auth Flow**: register → verify email → login → token refresh
   - **Checkout Flow**: add to cart → merge guest → create order → payment initiated
   - **Webhook Flow**: payment webhook → order status updated → event published
   - **Promo Flow**: apply promotion → apply coupon → calculate discount

4. Cleanup após testes

**Critérios de Pronto:**
- ✓ +20 integration tests
- ✓ Full flows testados
- ✓ Happy path + error scenarios
- ✓ Tests passam no CI

---

### TASK 10.6 - Criar Contract/API Tests
**Objetivo:** Testes de contratos entre frontend e backend

**Arquivos:**
```
tests/Ecommerce.API.IntegrationTests/ContractTests/
  ├── ProductContractTests.cs
  ├── OrderContractTests.cs
  └── PaymentContractTests.cs
```

**Passos:**
1. Testar que endpoints retornam DTOs conforme contrato
2. Validar schemas de requests/responses
3. Testar versioning (v1 vs v2)
4. Examples:
   - `GET /api/v1/products/{id}` retorna ProductDto com fields X
   - `POST /api/v1/orders` aceita CreateOrderRequest e retorna OrderDto

**Critérios de Pronto:**
- ✓ Contratos testados
- ✓ Compatibilidade v1/v2
- ✓ Tests

---

### TASK 10.7 - Criar Performance Tests
**Objetivo:** Benchmark de endpoints críticos

**Arquivos:**
```
tests/Ecommerce.API.IntegrationTests/PerformanceTests.cs
```

**Passos:**
1. Testes de carga para:
   - Search/suggest (< 100ms)
   - Cart operations (< 50ms)
   - Checkout (< 500ms)
   - Webhook (< 100ms)

2. Usar BenchmarkDotNet ou Apache JMeter

3. Baselines: ciência de dados esperada

**Critérios de Pronto:**
- ✓ Benchmarks coletados
- ✓ Baselines definidos
- ✓ CI monitora regressions

---

### TASK 10.8 - Setup CI/CD Pipeline
**Objetivo:** GitHub Actions para build, test, deploy

**Arquivos:**
```
.github/workflows/build-and-test.yml
.github/workflows/deploy-staging.yml
.github/workflows/deploy-production.yml
```

**Passos:**
1. Workflow: Build + Test + SonarQube
2. Workflow: Deploy to Staging on PR merge
3. Workflow: Deploy to Production on release tag
4. Artifacts: NuGet packages, Docker images

**Critérios de Pronto:**
- ✓ CI/CD pipeline executando
- ✓ Tests passam antes de deploy
- ✓ Releases automáticas

---

## 📊 RESUMO EXECUTIVO

**Total de Tasks:** 87  
**Épicos:** 10

| Épico | Tasks | Status |
|-------|-------|--------|
| 1. Backend Base + DB | 8 | Não iniciado |
| 2. Auth Robusto | 9 | Não iniciado |
| 3. Catálogo + Busca | 6 | Não iniciado |
| 4. Carrinho Resiliente | 6 | Não iniciado |
| 5. Promoções e Cupons | 4 | Não iniciado |
| 6. Pedidos + Checkout | 4 | Não iniciado |
| 7. Pagamentos | 5 | Não iniciado |
| 8. Webhooks + Idempotência | 5 | Não iniciado |
| 9. Admin Panel | 7 | Não iniciado |
| 10. Observabilidade + Testes | 8 | Não iniciado |

---

## 🎯 RECOMENDAÇÃO DE ORDEM

1. **ÉPICO 1** (Backend Base) - Bloqueante para todos
2. **ÉPICO 2** (Auth) - Necessário para autenticação dos endpoints
3. **ÉPICO 3** (Catálogo) - Permite testar GET público
4. **ÉPICO 4** (Carrinho) - Base para checkout
5. **ÉPICO 5** (Promoções) - Integra com carrinho/order
6. **ÉPICO 6** (Pedidos) - Antes de pagamentos
7. **ÉPICO 7** (Pagamentos) - Integra com webhooks
8. **ÉPICO 8** (Webhooks) - Async processing
9. **ÉPICO 9** (Admin) - Gerenciamento
10. **ÉPICO 10** (Testes/Observabilidade) - Contínuo, não bloqueante

---

**Estimativa Total:** 12-16 semanas (1 dev fullstack + 1 QA)
