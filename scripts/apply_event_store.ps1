param(
    [string]$Host = 'localhost',
    [int]$Port = 5433,
    [string]$Database = 'ecommerce',
    [string]$User = 'admin',
    [string]$Password = 'changeme'
)

# Requires psql in PATH
$env:PGPASSWORD = $Password
$script = Join-Path $PSScriptRoot 'sql\001_create_event_store.sql'
if (-not (Test-Path $script)) { Write-Error "SQL script not found: $script"; exit 1 }

Write-Host "Applying event_store SQL to $Host:$Port/$Database"
psql -h $Host -p $Port -U $User -d $Database -f $script
if ($LASTEXITCODE -ne 0) { Write-Error "psql failed with code $LASTEXITCODE"; exit $LASTEXITCODE }
Write-Host "Done."