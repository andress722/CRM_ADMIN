# 🚀 GETTING STARTED - Sistema E-Commerce "Loja de Produtos"

**Duração:** ~45 minutos  
**Objetivo:** Setup completo do ambiente de desenvolvimento  
**Pré-requisitos:** Git, Docker, .NET 8 SDK, Node.js 18+

---

## STEP 1: Clonar & Organizar (5 min)

```bash
# Clone o repositório (ou crie estrutura localmente)
git clone <repo-url> ecommerce-loja
cd ecommerce-loja

# Crie estrutura de pastas
mkdir -p src tests

# Você já tem todos os docs no root:
# ECOMMERCE_PLAN.md, ECOMMERCE_TASKS.md, etc
```

---

## STEP 2: Backend Setup (15 min)

### 2.1 Criar Solução .NET

```bash
cd src

# Criar solução
dotnet new sln -n Ecommerce

# Criar projects (Domain → Application → Infrastructure → API)
dotnet new classlib -n Ecommerce.Domain -o Ecommerce.Domain
dotnet new classlib -n Ecommerce.Application -o Ecommerce.Application
dotnet new classlib -n Ecommerce.Infrastructure -o Ecommerce.Infrastructure
dotnet new webapi -n Ecommerce.API -o Ecommerce.API

# Adicionar projects à solução
dotnet sln add Ecommerce.Domain/Ecommerce.Domain.csproj
dotnet sln add Ecommerce.Application/Ecommerce.Application.csproj
dotnet sln add Ecommerce.Infrastructure/Ecommerce.Infrastructure.csproj
dotnet sln add Ecommerce.API/Ecommerce.API.csproj

# Configurar referências
cd Ecommerce.Application && dotnet add reference ../Ecommerce.Domain/Ecommerce.Domain.csproj
cd ../Ecommerce.Infrastructure && dotnet add reference ../Ecommerce.Domain/Ecommerce.Domain.csproj ../Ecommerce.Application/Ecommerce.Application.csproj
cd ../Ecommerce.API && dotnet add reference ../Ecommerce.Infrastructure/Ecommerce.Infrastructure.csproj ../Ecommerce.Application/Ecommerce.Application.csproj
```

### 2.2 Instalar NuGet Packages

```bash
cd Ecommerce.Domain
dotnet add package Microsoft.Extensions.Identity.Core

cd ../Ecommerce.Application
dotnet add package AutoMapper
dotnet add package FluentValidation
dotnet add package MediatR

cd ../Ecommerce.Infrastructure
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
dotnet add package Serilog
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Sinks.File
dotnet add package Hangfire
dotnet add package Hangfire.PostgreSql

cd ../Ecommerce.API
dotnet add package Asp.Versioning.Mvc.ApiExplorer
dotnet add package Swashbuckle.AspNetCore
dotnet add package IdentityModel
```

### 2.3 Testar Build

```bash
cd .. && dotnet build
# Deve compilar sem erros
```

---

## STEP 3: Database Setup (10 min)

### 3.1 PostgreSQL com Docker

```bash
# Do root do projeto, crie docker-compose.yml:
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ecommerce-db
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ecommerce-cache
    ports:
      - "6379:6379"

volumes:
  postgres_data:
EOF

# Iniciar containers
docker-compose up -d

# Verificar
docker-compose ps
```

### 3.2 Connection String

```bash
# Em src/Ecommerce.API/appsettings.json, adicione:
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=ecommerce;Username=admin;Password=admin123;"
  }
}
```

### 3.3 EF Core Migrations

```bash
cd src/Ecommerce.API

# Adicionar EF Core tools
dotnet add package Microsoft.EntityFrameworkCore.Tools

# Criar primeira migration (vazia, para depois adicionar entities)
dotnet ef migrations add InitialCreate

# Aplicar migration
dotnet ef database update

# Verificar banco
# Conectar: psql -h localhost -U admin -d ecommerce
```

---

## STEP 4: Frontend Setup (10 min)

### 4.1 Criar Next.js App

```bash
cd .. && cd ..  # Volte ao root

# Criar app Next.js
npx create-next-app@latest frontend --typescript --tailwind --no-eslint

cd frontend

# Instalar dependências adicionais
npm install zustand @tanstack/react-query axios zod react-hook-form
npm install -D @types/node @types/react
```

### 4.2 Estrutura de Pastas

```bash
# Criar estrutura baseada em ECOMMERCE_FRONTEND.md
mkdir -p src/{app,components,hooks,stores,services,types,utils,config}

# Exemplo básico de store (Zustand)
cat > src/stores/authStore.ts << 'EOF'
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: any | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: any) => void;
  setTokens: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (token) => set({ accessToken: token }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false })
    }),
    { name: 'auth-storage' }
  )
);
EOF
```

### 4.3 API Client

```bash
cat > src/lib/api.ts << 'EOF'
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export default api;
EOF
```

---

## STEP 5: Run & Test (5 min)

### 5.1 Backend

```bash
cd src/Ecommerce.API

# Executar API
dotnet run

# Deve estar disponível em: http://localhost:5000
# Swagger em: http://localhost:5000/swagger
```

### 5.2 Frontend

```bash
cd frontend

# Executar dev server
npm run dev

# Deve estar disponível em: http://localhost:3000
```

### 5.3 Verificar

```bash
# Backend health check
curl http://localhost:5000/health

# Frontend home
curl http://localhost:3000
```

---

## STEP 6: Primeiro Endpoint (5 min)

### 6.1 Criar entidade simples (User)

```bash
# Em src/Ecommerce.Domain/Entities/User.cs
cat > src/Ecommerce.Domain/Entities/User.cs << 'EOF'
namespace Ecommerce.Domain.Entities;

public class User
{
  public Guid Id { get; set; }
  public string Email { get; set; }
  public string FullName { get; set; }
  public string PasswordHash { get; set; }
  public bool IsEmailVerified { get; set; }
  public DateTime CreatedAt { get; set; }
}
EOF
```

### 6.2 DbContext

```bash
cat > src/Ecommerce.Infrastructure/Data/EcommerceDbContext.cs << 'EOF'
using Microsoft.EntityFrameworkCore;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Infrastructure.Data;

public class EcommerceDbContext : DbContext
{
  public EcommerceDbContext(DbContextOptions<EcommerceDbContext> options)
    : base(options) { }

  public DbSet<User> Users { get; set; }

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    base.OnModelCreating(modelBuilder);

    modelBuilder.Entity<User>(entity =>
    {
      entity.HasKey(e => e.Id);
      entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
      entity.HasIndex(e => e.Email).IsUnique();
    });
  }
}
EOF
```

### 6.3 Repository Pattern

```bash
cat > src/Ecommerce.Application/Repositories/IUserRepository.cs << 'EOF'
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Repositories;

public interface IUserRepository
{
  Task<User> GetByIdAsync(Guid id);
  Task<User> GetByEmailAsync(string email);
  Task AddAsync(User user);
  Task UpdateAsync(User user);
}
EOF
```

### 6.4 Service

```bash
cat > src/Ecommerce.Application/Services/UserService.cs << 'EOF'
using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class UserService
{
  private readonly IUserRepository _repository;

  public UserService(IUserRepository repository) => _repository = repository;

  public async Task<User> GetUserAsync(Guid id)
  {
    var user = await _repository.GetByIdAsync(id);
    if (user == null)
      throw new Exception("User not found");
    return user;
  }
}
EOF
```

### 6.5 Controller

```bash
cat > src/Ecommerce.API/Controllers/UsersController.cs << 'EOF'
using Microsoft.AspNetCore.Mvc;
using Ecommerce.Application.Services;

namespace Ecommerce.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class UsersController : ControllerBase
{
  private readonly UserService _service;

  public UsersController(UserService service) => _service = service;

  [HttpGet("{id}")]
  public async Task<IActionResult> GetUser(Guid id)
  {
    var user = await _service.GetUserAsync(id);
    return Ok(user);
  }
}
EOF
```

### 6.6 Register no Program.cs

```bash
# Em src/Ecommerce.API/Program.cs, adicione:

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<UserService>();
```

---

## STEP 7: Próximos Passos

**Agora você está pronto para:**

1. **Implementar Tasks** conforme `ECOMMERCE_TASKS.md`
   - Task 1.1: ✅ Done (você acabou de fazer)
   - Task 1.2: Próxima (adicionar mais entities)

2. **Seguir documentações específicas:**
   - `ECOMMERCE_PLAN.md` - Para arquitetura detalhada
   - `ECOMMERCE_FRONTEND.md` - Para componentes React
   - `ECOMMERCE_TESTING.md` - Para testes
   - `ECOMMERCE_DEVOPS.md` - Para deployment

3. **Estrutura sugerida por épico:**
   - Épico 1 (semana 1): Backend base + Auth
   - Épico 2 (semana 2): Catálogo + Busca
   - Épico 3 (semana 3): Carrinho
   - Épico 4 (semana 4): Pedidos + Pagamentos

---

## 📚 Referências Rápidas

| Doc | Para quê? |
|-----|-----------|
| ECOMMERCE_PLAN.md | Arquitetura, entities, SQL DDL |
| ECOMMERCE_TASKS.md | Task list, estimar sprints |
| ECOMMERCE_FRONTEND.md | UI components, hooks, stores |
| ECOMMERCE_TESTING.md | Testes, CI/CD setup |
| ECOMMERCE_DEVOPS.md | Docker, K8s, deploy |
| ECOMMERCE_COMPLIANCE.md | Segurança, LGPD/GDPR |

---

## ⚠️ Troubleshooting

**"Port 5432 already in use"**
```bash
docker-compose down
docker-compose up -d
```

**"Migration failed"**
```bash
dotnet ef database drop --force
dotnet ef database update
```

**"npm install fails"**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

**Pronto! Você tem um projeto funcionando. Agora é só implementar! 🎯**

---

**Time estimate to reach MVP:** 16 weeks (conforme ECOMMERCE_TASKS.md)

**Dúvidas?** Consulte o documento correspondente!
