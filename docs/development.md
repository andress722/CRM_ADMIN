# Development Runbook

## Prerequisites

- .NET 9 SDK
- Node.js 18+ and npm
- Go 1.21+
- Python 3.9+
- Docker (optional, for local services)

## Environment Variables

Backend (appsettings.json or environment overrides):
- `ConnectionStrings__DefaultConnection`
- `Jwt__SecretKey`
- `Cors__AllowedOrigins` (array, or `*` for any origin)
- `Sentry__Dsn` (optional)

Admin frontend (admin-frontend/.env.local):
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_LEGACY_API_URL`

Storefront (storefront/.env.local):
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`

## Run the Backend API

From the repo root:

- `dotnet run --project src/Ecommerce.API`

The API listens on the configured port and exposes:
- `GET /health`
- `GET /metrics`

## Run the Admin Frontend

From the repo root:

- `cd admin-frontend`
- `npm install`
- `npm run dev`

## Run the Storefront

From the repo root:

- `cd storefront`
- `npm install`
- `npm run dev`

## Performance Tests (k6)

The k6 checkout flow test lives at:
- `test/performance/checkout.js`

Required environment variables:
- `API_BASE_URL` (e.g. `http://localhost:5071`)
- `AUTH_TOKEN` (valid JWT)

Optional variables:
- `PRODUCT_ID`
- `SHIPPING_ADDRESS_ID`

Example:
- `API_BASE_URL=http://localhost:5071 AUTH_TOKEN=... k6 run test/performance/checkout.js`

## Troubleshooting

- CORS errors: update `Cors__AllowedOrigins` in appsettings or environment variables.
- 401s in frontends: verify `NEXT_PUBLIC_API_URL` and the backend auth configuration.
- Missing traces: set `Observability__EnableOpenTelemetry=true` and `Observability__OtlpEndpoint`.
