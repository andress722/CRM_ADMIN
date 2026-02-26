<#
Dev bootstrap helper.
- Applies EF Core migrations against a configurable connection string.
- Starts API with seed enabled by default (dev).
- Optionally starts admin/storefront dev servers.

Examples:
  .\scripts\dev-start.ps1
  .\scripts\dev-start.ps1 -StartAdmin -InstallFrontendDeps
  .\scripts\dev-start.ps1 -StartAdmin -StartStorefront -ApiPort 5071
  .\scripts\dev-start.ps1 -SkipMigrations
#>

param(
  [string]$Connection = "Host=localhost;Port=5433;Database=ecommerce;Username=admin;Password=changeme;SslMode=Disable;",
  [int]$ApiPort = 5071,
  [switch]$SkipMigrations,
  [switch]$StartAdmin,
  [int]$AdminPort = 3003,
  [switch]$StartStorefront,
  [int]$StorefrontPort = 3006,
  [switch]$InstallFrontendDeps,
  [switch]$DisableSeed
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
$apiDir = Join-Path $repoRoot 'src\Ecommerce.API'
$adminDir = Join-Path $repoRoot 'admin-frontend'
$storefrontDir = Join-Path $repoRoot 'info-tech-gamer-storefront-build'
$applyMigrationsScript = Join-Path $scriptDir 'apply-migrations.ps1'

function Test-CommandExists {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-Path $applyMigrationsScript)) {
  throw "Script not found: $applyMigrationsScript"
}

if (-not (Test-Path $apiDir)) {
  throw "API directory not found: $apiDir"
}

if (-not (Test-CommandExists 'dotnet')) {
  throw "dotnet command not found in PATH."
}

if (($StartAdmin -or $StartStorefront -or $InstallFrontendDeps) -and -not (Test-CommandExists 'npm')) {
  throw "npm command not found in PATH."
}

Write-Host "Repo root: $repoRoot"

if (-not $SkipMigrations) {
  Write-Host "Applying migrations..."
  & $applyMigrationsScript -Connection $Connection
} else {
  Write-Host "Skipping migrations (--SkipMigrations)."
}

$seedEnabledValue = if ($DisableSeed) { 'false' } else { 'true' }
$apiArgs = @('run','--project','Ecommerce.API.csproj','--urls',"http://0.0.0.0:$ApiPort")

Write-Host "Starting API on http://localhost:$ApiPort (Database__SeedData=$seedEnabledValue)..."
Start-Process -FilePath 'dotnet' -ArgumentList $apiArgs -WorkingDirectory $apiDir -NoNewWindow -Environment @{
  'ASPNETCORE_ENVIRONMENT' = 'Development'
  'ConnectionStrings__DefaultConnection' = $Connection
  'Database__SeedData' = $seedEnabledValue
}

if ($StartAdmin) {
  if (-not (Test-Path $adminDir)) {
    throw "Admin directory not found: $adminDir"
  }

  Write-Host "Starting admin frontend on http://localhost:$AdminPort ..."
  if ($InstallFrontendDeps) {
    Push-Location $adminDir
    try {
      npm ci
    } finally {
      Pop-Location
    }
  }

  Start-Process -FilePath 'npm' -ArgumentList @('run','dev','--','-p',$AdminPort) -WorkingDirectory $adminDir -NoNewWindow
}

if ($StartStorefront) {
  if (-not (Test-Path $storefrontDir)) {
    throw "Storefront directory not found: $storefrontDir"
  }

  Write-Host "Starting storefront on http://localhost:$StorefrontPort ..."
  if ($InstallFrontendDeps) {
    Push-Location $storefrontDir
    try {
      npm ci
    } finally {
      Pop-Location
    }
  }

  Start-Process -FilePath 'npm' -ArgumentList @('run','dev','--','-p',$StorefrontPort) -WorkingDirectory $storefrontDir -NoNewWindow
}

Write-Host ""
Write-Host "Dev bootstrap completed."
Write-Host "- API: http://localhost:$ApiPort"
if ($StartAdmin) { Write-Host "- Admin: http://localhost:$AdminPort" }
if ($StartStorefront) { Write-Host "- Storefront: http://localhost:$StorefrontPort" }
Write-Host "Use .\\scripts\\cleanup.ps1 to stop common local ports."
