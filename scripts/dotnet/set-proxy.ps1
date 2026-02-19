param(
  [Parameter(Mandatory = $true)]
  [string]$ProxyUrl,
  [string]$NoProxy = "localhost,127.0.0.1",
  [switch]$PersistUser
)

$ErrorActionPreference = "Stop"

$env:HTTP_PROXY = $ProxyUrl
$env:HTTPS_PROXY = $ProxyUrl
$env:NO_PROXY = $NoProxy

Write-Host "Session proxy configured:"
Write-Host "HTTP_PROXY=$env:HTTP_PROXY"
Write-Host "HTTPS_PROXY=$env:HTTPS_PROXY"
Write-Host "NO_PROXY=$env:NO_PROXY"

if ($PersistUser) {
  setx HTTP_PROXY $ProxyUrl | Out-Null
  setx HTTPS_PROXY $ProxyUrl | Out-Null
  setx NO_PROXY $NoProxy | Out-Null
  Write-Host "User-level environment variables persisted via setx."
}

