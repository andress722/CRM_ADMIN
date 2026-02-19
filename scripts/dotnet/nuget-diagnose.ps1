param(
  [string]$HostName = "api.nuget.org",
  [int]$Port = 443
)

$ErrorActionPreference = "Stop"

Write-Host "==> .NET info"
dotnet --info

Write-Host "`n==> NuGet sources"
dotnet nuget list source

Write-Host "`n==> Connectivity test: ${HostName}:$Port"
Test-NetConnection $HostName -Port $Port | Format-List ComputerName,RemotePort,TcpTestSucceeded

Write-Host "`n==> Proxy env vars"
"HTTP_PROXY=$env:HTTP_PROXY"
"HTTPS_PROXY=$env:HTTPS_PROXY"
"NO_PROXY=$env:NO_PROXY"
