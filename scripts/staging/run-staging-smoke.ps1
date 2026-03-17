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
  [switch]$AllowMissingAdminAuth,
  [switch]$RunCrmCrud
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

function Invoke-ApiRequest {
  param(
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
      SkipHttpErrorCheck = $true
    }

    if ($null -ne $Body) {
      $params["Body"] = $Body
      $params["ContentType"] = "application/json"
    }

    $response = Invoke-WebRequest @params
    $statusCode = [int]$response.StatusCode

    $parsedBody = $null
    if (-not [string]::IsNullOrWhiteSpace($response.Content)) {
      try {
        $parsedBody = $response.Content | ConvertFrom-Json
      }
      catch {
        $parsedBody = $null
      }
    }

    return [PSCustomObject]@{
      passed = ($AcceptedStatusCodes -contains $statusCode)
      statusCode = $statusCode
      details = "HTTP $statusCode"
      body = $parsedBody
    }
  }
  catch {
    $statusCode = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    $passed = $AcceptedStatusCodes -contains $statusCode
    $detail = if ($statusCode -eq 0) { $_.Exception.Message } else { "HTTP $statusCode" }
    return [PSCustomObject]@{
      passed = $passed
      statusCode = $statusCode
      details = $detail
      body = $null
    }
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

  $request = Invoke-ApiRequest -Url $Url -Method $Method -Headers $Headers -Body $Body -AcceptedStatusCodes $AcceptedStatusCodes
  return New-CheckResult -Name $Name -Passed $request.passed -StatusCode $request.statusCode -Details $request.details
}

function Invoke-HttpCheckWithRetry {
  param(
    [string]$Name,
    [string]$Url,
    [string]$Method = "GET",
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [int[]]$AcceptedStatusCodes = @(200),
    [int]$MaxAttempts = 3,
    [int]$DelaySeconds = 2
  )

  $lastResult = $null
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $lastResult = Invoke-HttpCheck -Name $Name -Url $Url -Method $Method -Headers $Headers -Body $Body -AcceptedStatusCodes $AcceptedStatusCodes
    if ($lastResult.passed) {
      if ($attempt -gt 1) {
        $lastResult.details = "$($lastResult.details); recovered on retry $attempt/$MaxAttempts"
      }
      return $lastResult
    }

    if ($attempt -lt $MaxAttempts -and $lastResult.statusCode -eq 0) {
      Start-Sleep -Seconds $DelaySeconds
    }
  }

  return $lastResult
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

$results.Add((Invoke-HttpCheckWithRetry -Name "API health" -Url "$api/health" -AcceptedStatusCodes @(200) -MaxAttempts 3 -DelaySeconds 2))
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
      $leadListResult = Invoke-ApiRequest -Url "$api/api/v1/admin/crm/leads" -Headers $authHeaders -AcceptedStatusCodes @(200)
      $results.Add((New-CheckResult -Name "Admin CRM leads list" -Passed $leadListResult.passed -StatusCode $leadListResult.statusCode -Details $leadListResult.details))

      $opsEndpoint = "$api/api/v1/admin/ops/overview"
      $opsEndpointLabel = "api/v1/admin/ops/overview"
      $opsResult = Invoke-ApiRequest -Url $opsEndpoint -Headers $authHeaders -AcceptedStatusCodes @(200)
      if (-not $opsResult.passed -and $opsResult.statusCode -eq 404) {
        $legacyOpsEndpoint = "$api/api/v1/admin/overview"
        $legacyOpsResult = Invoke-ApiRequest -Url $legacyOpsEndpoint -Headers $authHeaders -AcceptedStatusCodes @(200)
        if ($legacyOpsResult.passed) {
          $opsResult = $legacyOpsResult
          $opsEndpointLabel = "api/v1/admin/overview"
        }
      }

      $opsDetails = $opsResult.details
      if ($opsResult.passed -and $null -ne $opsResult.body) {
        $slo = $opsResult.body.slo
        $alerts = $opsResult.body.alerts
        if ($null -ne $slo -and $null -ne $alerts) {
          $opsDetails = "HTTP $($opsResult.statusCode); endpoint=$opsEndpointLabel; p95Ms=$($slo.p95LatencyMs); high5xx=$($alerts.high5xx.status); deployFailure=$($alerts.deployFailure.status)"
        }
        else {
          $opsDetails = "HTTP $($opsResult.statusCode); endpoint=$opsEndpointLabel"
        }
      }
      elseif ($opsResult.passed) {
        $opsDetails = "$($opsResult.details); endpoint=$opsEndpointLabel"
      }

      $results.Add((New-CheckResult -Name "Admin ops overview" -Passed $opsResult.passed -StatusCode $opsResult.statusCode -Details $opsDetails))

      if ($RunCrmCrud.IsPresent) {
        $createdLeadId = $null
        try {
          $suffix = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
          $createPayload = @{
            name = "Smoke Lead $suffix"
            email = "smoke+$suffix@example.com"
            company = "Smoke Corp"
            value = 123.45
            owner = "automation"
            source = "staging-smoke"
            status = "New"
            createdAt = (Get-Date).ToUniversalTime().ToString("o")
          } | ConvertTo-Json

          $createResult = Invoke-ApiRequest -Url "$api/api/v1/admin/crm/leads" -Method "POST" -Headers $authHeaders -Body $createPayload -AcceptedStatusCodes @(200)
          $results.Add((New-CheckResult -Name "Admin CRM lead create" -Passed $createResult.passed -StatusCode $createResult.statusCode -Details $createResult.details))

          if ($createResult.passed -and $null -ne $createResult.body -and $null -ne $createResult.body.id) {
            $createdLeadId = [string]$createResult.body.id

            $patchPayload = @{ status = "Qualified" } | ConvertTo-Json
            $patchResult = Invoke-ApiRequest -Url "$api/api/v1/admin/crm/leads/$createdLeadId" -Method "PATCH" -Headers $authHeaders -Body $patchPayload -AcceptedStatusCodes @(200)
            $results.Add((New-CheckResult -Name "Admin CRM lead update" -Passed $patchResult.passed -StatusCode $patchResult.statusCode -Details $patchResult.details))
          }
          elseif ($createResult.passed) {
            $results.Add((New-CheckResult -Name "Admin CRM lead update" -Passed $false -StatusCode 0 -Details "Lead create succeeded but response did not include id"))
          }
        }
        finally {
          if (-not [string]::IsNullOrWhiteSpace($createdLeadId)) {
            $deleteResult = Invoke-ApiRequest -Url "$api/api/v1/admin/crm/leads/$createdLeadId" -Method "DELETE" -Headers $authHeaders -AcceptedStatusCodes @(204)
            $results.Add((New-CheckResult -Name "Admin CRM lead delete" -Passed $deleteResult.passed -StatusCode $deleteResult.statusCode -Details $deleteResult.details))
          }
          else {
            $results.Add((New-CheckResult -Name "Admin CRM lead delete" -Passed $false -StatusCode 0 -Details "Skipped because lead id is unavailable"))
          }
        }
      }
    }
  }
  catch {
    $statusCode = 0
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    $detail = if ($statusCode -eq 0) { $_.Exception.Message } else { "HTTP $statusCode" }
    $results.Add((New-CheckResult -Name "Admin API login" -Passed $false -StatusCode $statusCode -Details $detail))
    $results.Add((New-CheckResult -Name "Admin ops overview" -Passed $false -StatusCode 0 -Details "Skipped because admin auth failed"))

    if ($RunCrmCrud.IsPresent) {
      $results.Add((New-CheckResult -Name "Admin CRM lead create" -Passed $false -StatusCode 0 -Details "Skipped because admin auth failed"))
      $results.Add((New-CheckResult -Name "Admin CRM lead update" -Passed $false -StatusCode 0 -Details "Skipped because admin auth failed"))
      $results.Add((New-CheckResult -Name "Admin CRM lead delete" -Passed $false -StatusCode 0 -Details "Skipped because admin auth failed"))
    }
  }
}
else {
  $details = "AdminEmail/AdminPassword not provided; auth smoke skipped"
  $results.Add((New-CheckResult -Name "Admin API login" -Passed $AllowMissingAdminAuth.IsPresent -StatusCode 0 -Details $details))
  $results.Add((New-CheckResult -Name "Admin CRM leads list" -Passed $AllowMissingAdminAuth.IsPresent -StatusCode 0 -Details "Skipped because admin auth is missing"))
  $results.Add((New-CheckResult -Name "Admin ops overview" -Passed $AllowMissingAdminAuth.IsPresent -StatusCode 0 -Details "Skipped because admin auth is missing"))

  if ($RunCrmCrud.IsPresent) {
    $results.Add((New-CheckResult -Name "Admin CRM lead create" -Passed $false -StatusCode 0 -Details "Skipped because admin auth is missing"))
    $results.Add((New-CheckResult -Name "Admin CRM lead update" -Passed $false -StatusCode 0 -Details "Skipped because admin auth is missing"))
    $results.Add((New-CheckResult -Name "Admin CRM lead delete" -Passed $false -StatusCode 0 -Details "Skipped because admin auth is missing"))
  }
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
  runCrmCrud = $RunCrmCrud.IsPresent
  totalChecks = $results.Count
  failedChecks = $failed.Count
  passed = ($failed.Count -eq 0)
  checks = $results
}

$summary | ConvertTo-Json -Depth 10 | Set-Content -Path $outFile

$latestFile = Join-Path $OutDir "staging-smoke-latest.json"
Copy-Item -Path $outFile -Destination $latestFile -Force

Write-Host "Staging smoke evidence: $outFile"
Write-Host "Latest smoke evidence: $latestFile"
foreach ($r in $results) {
  $icon = if ($r.passed) { "OK" } else { "FAIL" }
  Write-Host ("[{0}] {1} -> {2} ({3})" -f $icon, $r.name, $r.statusCode, $r.details)
}

if ($failed.Count -gt 0) {
  Write-Error "Staging smoke failed with $($failed.Count) failing checks."
}

