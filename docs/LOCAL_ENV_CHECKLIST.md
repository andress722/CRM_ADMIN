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

## Backend
- `dotnet run --project src/Ecommerce.API`
- Validar `GET /health`

## Admin Frontend
- `cd admin-frontend`
- `npm install`
- `npm run dev`

## Storefront
- `cd storefront`
- `npm install`
- `npm run dev`

## Banco e Migracoes
- Aplicar migracoes (EF Core) antes de usar o backend.
- Confirmar conexao e seed se necessario.

## Verificacoes Rapidas
- Login no admin
- Dashboard carrega
- Storefront carrega pagina inicial
