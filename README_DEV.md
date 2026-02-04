## Development runbook (local)

Quick steps to run the API and Admin frontend locally (Windows PowerShell):

1. Start Postgres (docker):

```powershell
docker run -d --name postgres-dev -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=ecommerce -p 5433:5432 postgres:15
```

2. Apply EF migrations:

```powershell
.\scripts\apply-migrations.ps1 -Connection 'Host=localhost;Port=5433;Database=ecommerce;Username=admin;Password=changeme;SslMode=Disable;'
```

3. Start API and frontend (dev helper):

```powershell
.\scripts\dev-start.ps1
```

4. Access services:

- API health: `http://localhost:5071/health`
- Admin UI: `http://localhost:3003`

Notes and troubleshooting
- If port 3000 is in use the frontend runs on 3003 by default.
- The CI workflow enforces that `Observability:EnableOpenTelemetry` is not enabled in production config.
- To stop and cleanup local containers/processes run:

```powershell
.\scripts\cleanup.ps1
```
