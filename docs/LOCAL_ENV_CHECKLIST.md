# Checklist de Ambiente Local

## Pre-requisitos
- .NET 9 SDK
- Node.js 18+ e npm
- Go 1.21+
- Python 3.9+
- Docker (opcional)

## Variaveis de Ambiente
- Backend: `ConnectionStrings__DefaultConnection`, `Jwt__SecretKey`, `Cors__AllowedOrigins`
- Admin: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_LEGACY_API_URL`
- Storefront: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`

## Bootstrap recomendado (backend + seed + migrations)
- Executar: `./scripts/dev-start.ps1`
- O script aplica migrations e sobe a API em `http://localhost:5071` com seed habilitado em dev.
- Para subir admin junto: `./scripts/dev-start.ps1 -StartAdmin`
- Para subir admin + storefront: `./scripts/dev-start.ps1 -StartAdmin -StartStorefront`
- Para pular migrations: `./scripts/dev-start.ps1 -SkipMigrations`

## Backend
- `dotnet run --project src/Ecommerce.API`
- Validar `GET /health`

## Admin Frontend
- `cd admin-frontend`
- `npm install`
- `npm run dev`

## Storefront
- `cd info-tech-gamer-storefront-build`
- `npm install`
- `npm run dev`

## Banco e Migracoes
- Aplicar migracoes (EF Core) antes de usar o backend.
- Confirmar conexao e seed se necessario.

## Verificacoes Rapidas
- Login no admin
- Dashboard carrega
- Storefront carrega pagina inicial
