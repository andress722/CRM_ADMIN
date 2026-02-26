param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$AdminBaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$StorefrontBaseUrl,
  [string]$AdminEmail = "",
  [string]$AdminPassword = "",
  [string]$OutDir = "artifacts/staging",
  [switch]$AllowMissingAdminAuth
)

$ErrorActionPreference = "Stop"

function New-CheckResult {
  param(
    [string]$Name,
    [bool]$Passed,
    [int]$StatusCode,
    [string]$Details
  )

  [PSCustomObject]@{
    name = $Name
    passed = $Passed
    statusCode = $StatusCode
    details = $Details
    checkedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  }
}

function Invoke-HttpCheck {
  param(
    [string]$Name,
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [int[]]$AcceptedStatusCodes = @(200)
  )

  try {
    $params = @{
      Uri = $Url
      Method = $Method
      Headers = $Headers
      TimeoutSec = 20
      ErrorAction = "Stop"
    }

    if ($null -ne $Body) {
      $params["Body"] = $Body
      $params["ContentType"] = "application/json"
    }

    $response = Invoke-WebRequest @params
    $statusCode = [int]$response.StatusCode
    $passed = $AcceptedStatusCodes -contains $statusCode
    return New-CheckResult -Name $Name -Passed $passed -StatusCode $statusCode -Details "HTTP $statusCode"
  }
  catch {
    $statusCode = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    $passed = $AcceptedStatusCodes -contains $statusCode
    $detail = if ($statusCode -eq 0) { $_.Exception.Message } else { "HTTP $statusCode" }
    return New-CheckResult -Name $Name -Passed $passed -StatusCode $statusCode -Details $detail
  }
}

function Normalize-BaseUrl {
  param([string]$Url)
  return $Url.Trim().TrimEnd('/')
}

$api = Normalize-BaseUrl -Url $ApiBaseUrl
$admin = Normalize-BaseUrl -Url $AdminBaseUrl
$store = Normalize-BaseUrl -Url $StorefrontBaseUrl

$results = New-Object System.Collections.Generic.List[object]
$token = ""

$results.Add((Invoke-HttpCheck -Name "API health" -Url "$api/health" -AcceptedStatusCodes @(200)))
$results.Add((Invoke-HttpCheck -Name "API root" -Url "$api/" -AcceptedStatusCodes @(200)))
$results.Add((Invoke-HttpCheck -Name "API metrics endpoint reachable" -Url "$api/metrics" -AcceptedStatusCodes @(200,401,403)))

$results.Add((Invoke-HttpCheck -Name "Admin login page" -Url "$admin/login" -AcceptedStatusCodes @(200)))
$results.Add((Invoke-HttpCheck -Name "Storefront home" -Url "$store/" -AcceptedStatusCodes @(200)))

$hasAuthInput = -not [string]::IsNullOrWhiteSpace($AdminEmail) -and -not [string]::IsNullOrWhiteSpace($AdminPassword)

if ($hasAuthInput) {
  $loginPayload = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json

  try {
    $loginResponse = Invoke-RestMethod -Uri "$api/api/v1/auth/login" -Method POST -Body $loginPayload -ContentType "application/json" -TimeoutSec 20 -ErrorAction Stop
    $token = [string]$loginResponse.accessToken

    if ([string]::IsNullOrWhiteSpace($token)) {
      $results.Add((New-CheckResult -Name "Admin API login" -Passed $false -StatusCode 200 -Details "accessToken not returned"))
    }
    else {
      $results.Add((New-CheckResult -Name "Admin API login" -Passed $true -StatusCode 200 -Details "accessToken issued"))
      $authHeaders = @{ Authorization = "Bearer $token" }
      $results.Add((Invoke-HttpCheck -Name "Admin CRM leads list" -Url "$api/api/v1/admin/crm/leads" -Headers $authHeaders -AcceptedStatusCodes @(200)))
    }
  }
  catch {
    $statusCode = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    $detail = if ($statusCode -eq 0) { $_.Exception.Message } else { "HTTP $statusCode" }
    $results.Add((New-CheckResult -Name "Admin API login" -Passed $false -StatusCode $statusCode -Details $detail))
  }
}
else {
  $details = "AdminEmail/AdminPassword not provided; auth smoke skipped"
  $results.Add((New-CheckResult -Name "Admin API login" -Passed $AllowMissingAdminAuth.IsPresent -StatusCode 0 -Details $details))
  $results.Add((New-CheckResult -Name "Admin CRM leads list" -Passed $AllowMissingAdminAuth.IsPresent -StatusCode 0 -Details "Skipped because admin auth is missing"))
}

$failed = @($results | Where-Object { -not $_.passed })

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$outFile = Join-Path $OutDir "staging-smoke-$timestamp.json"

$summary = [PSCustomObject]@{
  executedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  apiBaseUrl = $api
  adminBaseUrl = $admin
  storefrontBaseUrl = $store
  totalChecks = $results.Count
  failedChecks = $failed.Count
  passed = ($failed.Count -eq 0)
  checks = $results
}

$summary | ConvertTo-Json -Depth 10 | Set-Content -Path $outFile

Write-Host "Staging smoke evidence: $outFile"
foreach ($r in $results) {
  $icon = if ($r.passed) { "OK" } else { "FAIL" }
  Write-Host ("[{0}] {1} -> {2} ({3})" -f $icon, $r.name, $r.statusCode, $r.details)
}

if ($failed.Count -gt 0) {
  Write-Error "Staging smoke failed with $($failed.Count) failing checks."
}
