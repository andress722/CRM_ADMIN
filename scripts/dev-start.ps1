<#
Dev helper: apply migrations, start API and frontend for local development (without docker-compose).
Usage: .\scripts\dev-start.ps1
#>

Write-Host "Applying migrations..."
.\scripts\apply-migrations.ps1 -Connection 'Host=localhost;Port=5433;Database=ecommerce;Username=admin;Password=changeme;SslMode=Disable;'

Write-Host "Starting API in background..."
Start-Process -FilePath 'dotnet' -ArgumentList 'run','--urls','http://0.0.0.0:5071' -WorkingDirectory 'src\Ecommerce.API' -NoNewWindow

Write-Host "Building frontend..."
Push-Location admin-frontend
npm ci
npm run build
Start-Process -FilePath 'npx.cmd' -ArgumentList 'next','start','-p','3003' -WorkingDirectory (Get-Location) -NoNewWindow
Pop-Location

Write-Host "Dev services started: API http://localhost:5071, Frontend http://localhost:3003"
