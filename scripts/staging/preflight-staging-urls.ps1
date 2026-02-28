param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$AdminBaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$StorefrontBaseUrl,
  [string]$OutDir = "artifacts/staging"
)

$ErrorActionPreference = "Stop"

function Normalize-BaseUrl {
  param([string]$Url)
  return $Url.Trim().TrimEnd('/')
}

function Test-Url {
  param(
    [string]$Name,
    [string]$Url,
    [int[]]$AcceptedStatusCodes = @(200)
  )

  $statusCode = 0
  $server = ""
  $bodySample = ""
  $details = ""

  try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 20 -SkipHttpErrorCheck
    $statusCode = [int]$response.StatusCode
    $server = [string]$response.Headers.Server
    $bodySample = if ([string]::IsNullOrWhiteSpace($response.Content)) { "" } else { $response.Content.Substring(0, [Math]::Min(280, $response.Content.Length)) }
  }
  catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }
    $details = $_.Exception.Message
  }

  $classification = "unknown"
  if ($AcceptedStatusCodes -contains $statusCode) {
    $classification = "ok"
  }
  elseif ($bodySample -match 'DEPLOYMENT_NOT_FOUND') {
    $classification = "deployment_not_found"
  }
  elseif ($statusCode -eq 404) {
    $classification = "http_404"
  }
  elseif ($statusCode -eq 0) {
    $classification = "unreachable"
  }

  if ([string]::IsNullOrWhiteSpace($details)) {
    $details = "HTTP $statusCode"
  }

  return [PSCustomObject]@{
    name = $Name
    url = $Url
    statusCode = $statusCode
    server = $server
    classification = $classification
    passed = ($classification -eq "ok")
    details = $details
    bodySample = $bodySample
    checkedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  }
}

$api = Normalize-BaseUrl -Url $ApiBaseUrl
$admin = Normalize-BaseUrl -Url $AdminBaseUrl
$store = Normalize-BaseUrl -Url $StorefrontBaseUrl

$checks = @(
  (Test-Url -Name "API root preflight" -Url "$api/"),
  (Test-Url -Name "Admin login preflight" -Url "$admin/login"),
  (Test-Url -Name "Storefront home preflight" -Url "$store/")
)

$failed = @($checks | Where-Object { -not $_.passed })

if (-not (Test-Path $OutDir)) {
  New-Item -Path $OutDir -ItemType Directory -Force | Out-Null
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$outFile = Join-Path $OutDir "staging-preflight-$timestamp.json"
$latestFile = Join-Path $OutDir "staging-preflight-latest.json"

$result = [PSCustomObject]@{
  executedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  apiBaseUrl = $api
  adminBaseUrl = $admin
  storefrontBaseUrl = $store
  totalChecks = $checks.Count
  failedChecks = $failed.Count
  passed = ($failed.Count -eq 0)
  checks = $checks
}

$result | ConvertTo-Json -Depth 10 | Set-Content -Path $outFile
Copy-Item -Path $outFile -Destination $latestFile -Force

Write-Host "Staging preflight artifact: $outFile"
Write-Host "Latest preflight artifact: $latestFile"
foreach ($check in $checks) {
  $icon = if ($check.passed) { "OK" } else { "FAIL" }
  Write-Host ("[{0}] {1} -> {2} ({3})" -f $icon, $check.name, $check.statusCode, $check.classification)
}

if ($failed.Count -gt 0) {
  Write-Error "Staging preflight failed with $($failed.Count) failing checks."
}
