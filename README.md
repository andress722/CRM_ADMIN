# E-commerce Platform Monorepo

Monorepo with a .NET 9 backend API, an admin frontend (Next.js), a storefront frontend (Next.js), and integration tests.

## Main folders

- `src/` — backend solution (`Ecommerce.sln`) with API, Application, Domain and Infrastructure.
- `tests/Ecommerce.API.Tests/` — backend integration and API tests.
- `admin-frontend/` — internal admin panel.
- `info-tech-gamer-storefront-build/` — storefront frontend.
- `docs/` — technical documentation and checklists.

## Backend quick start

1. Configure environment variables (use `.env.api.example` as reference).
2. Run API:

```bash
dotnet run --project src/Ecommerce.API/Ecommerce.API.csproj
```

3. Health check:

```bash
curl http://localhost:5000/health
```

## Tests

- Backend tests:

```bash
dotnet test tests/Ecommerce.API.Tests/Ecommerce.API.Tests.csproj
```

- CI helper script:

```bash
./scripts/ci/build-and-test.sh
```

## NuGet troubleshooting (Windows)

If `dotnet restore` fails with `NU1301` against `api.nuget.org`, run:

```powershell
.\scripts\dotnet\nuget-diagnose.ps1
.\scripts\dotnet\nuget-recover.ps1
```

The recovery script uses `NuGet.config` and serial restore (`-m:1` + `RestoreDisableParallel=true`) to reduce restore instability.
Use `-ClearCache` only when needed:

```powershell
.\scripts\dotnet\nuget-recover.ps1 -ClearCache
```

If you are behind a corporate proxy:

```powershell
.\scripts\dotnet\set-proxy.ps1 -ProxyUrl "http://YOUR_PROXY:PORT" -PersistUser
```

## Security notes

- Do not commit real credentials in `.env*` or `appsettings*.json`.
- Configure `Jwt:SecretKey` through environment variables in non-development environments.
- Use `.env.api.example` and `.env.local.example` as templates.
