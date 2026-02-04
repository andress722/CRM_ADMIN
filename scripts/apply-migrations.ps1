# Applies EF Core migrations against the Postgres service named 'postgres' (docker-compose)
param(
  [string]$Connection = "Host=postgres;Port=5432;Database=ecommerce;Username=admin;Password=changeme;SslMode=Disable;"
)

Write-Host "Applying EF migrations using connection: $Connection"
Set-Location -Path "src\Ecommerce.Infrastructure"

dotnet restore
dotnet ef database update --startup-project "..\Ecommerce.API\Ecommerce.API.csproj" --connection "$Connection"

Write-Host "Migrations applied."
