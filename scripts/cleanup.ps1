<#
Cleanup helper: stop running dotnet/next processes started by dev-start and remove postgres-dev container.
Usage: .\scripts\cleanup.ps1
#>

Write-Host "Stopping processes listening on ports 5071 and 3003..."
$p5071 = Get-NetTCPConnection -LocalPort 5071 -ErrorAction SilentlyContinue
if ($p5071) { Stop-Process -Id $p5071.OwningProcess -Force -ErrorAction SilentlyContinue }
$p3003 = Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue
if ($p3003) { Stop-Process -Id $p3003.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host "Removing docker container 'postgres-dev' if exists..."
docker rm -f postgres-dev -v 2>$null || Write-Host "No postgres-dev container to remove."

Write-Host "Cleanup complete."
