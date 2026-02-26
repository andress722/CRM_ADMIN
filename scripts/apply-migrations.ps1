# Applies EF Core migrations against the Postgres service named 'postgres' (docker-compose)
param(
  [string]$Connection = "Host=postgres;Port=5432;Database=ecommerce;Username=admin;Password=changeme;SslMode=Disable;"
)

Write-Host "Applying EF migrations using provided connection string (redacted)."
Set-Location -Path "src\Ecommerce.Infrastructure"

dotnet restore --configfile "..\..\NuGet.config" -m:1 /p:RestoreDisableParallel=true

if (-not (dotnet tool list --global | Select-String -Pattern "dotnet-ef")) {
  Write-Host "dotnet-ef not found globally. Installing..."
  dotnet tool install --global dotnet-ef --version 9.*
}

dotnet ef database update --startup-project "..\Ecommerce.API\Ecommerce.API.csproj" --connection "$Connection"

Write-Host "Migrations applied."

