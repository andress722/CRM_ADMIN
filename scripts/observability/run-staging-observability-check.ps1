param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$AdminBearerToken,
  [string]$OutDir = "artifacts/observability"
)

$ErrorActionPreference = "Stop"

function Invoke-CheckedRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Headers,
    [string]$Body,
    [int[]]$AllowedStatus = @(200)
  )

  try {
    $params = @{
      Method = $Method
      Uri = $Url
      Headers = $Headers
      TimeoutSec = 30
      SkipHttpErrorCheck = $true
    }
    if ($Body) {
      $params["Body"] = $Body
      $params["ContentType"] = "application/json"
    }

    $response = Invoke-WebRequest @params
    $status = [int]$response.StatusCode

    if ($AllowedStatus -notcontains $status) {
      throw "$Name failed with status $status (allowed: $($AllowedStatus -join ','))."
    }

    return [PSCustomObject]@{
      name = $Name
      url = $Url
      status = $status
      body = $response.Content
      timestamp = (Get-Date).ToString("o")
    }
  }
  catch {
    throw "Request '$Name' failed: $($_.Exception.Message)"
  }
}

function Resolve-Endpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string[]]$Candidates,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Headers,
    [int[]]$AllowedStatus = @(200)
  )

  foreach ($candidate in $Candidates) {
    try {
      $probe = Invoke-CheckedRequest -Name "$Name-probe" -Method "GET" -Url $candidate -Headers $Headers -AllowedStatus $AllowedStatus
      Write-Host "Resolved $Name endpoint: $candidate (status $($probe.status))"
      return $candidate
    }
    catch {
      Write-Host ("Probe failed for {0}: {1}" -f $candidate, $_.Exception.Message)
    }
  }

  throw "Could not resolve endpoint for '$Name'. Tried: $($Candidates -join ', '). This usually means ApiBaseUrl is incorrect or staging service is returning 404 for all routes."
}

$api = $ApiBaseUrl.TrimEnd('/')
$headersAuth = @{ Authorization = "Bearer $AdminBearerToken" }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$healthUrl = Resolve-Endpoint -Name "health" -Candidates @(
  "$api/health",
  "$api/api/v1/health",
  "$api/",
  "$api/api/v1/recommendations",
  "$api/api/v1/products"
) -Headers @{} -AllowedStatus @(200)

$metricsUrl = Resolve-Endpoint -Name "metrics" -Candidates @(
  "$api/metrics",
  "$api/api/v1/metrics"
) -Headers $headersAuth -AllowedStatus @(200)

$webhookUrl = "$api/api/webhooks/mercadopago"

$results = @()
$results += Invoke-CheckedRequest -Name "health" -Method "GET" -Url $healthUrl -Headers @{} -AllowedStatus @(200)
$results += Invoke-CheckedRequest -Name "metrics-admin" -Method "GET" -Url $metricsUrl -Headers $headersAuth -AllowedStatus @(200)

# Synthetic webhook signature failure should return 400/401/503 depending on environment wiring.
$results += Invoke-CheckedRequest -Name "webhook-invalid-signature" -Method "POST" -Url $webhookUrl -Headers @{ "x-signature" = "invalid" } -Body "{}" -AllowedStatus @(400,401,503)

# Synthetic probe burst for dashboard visibility.
for ($i = 0; $i -lt 30; $i++) {
  $results += Invoke-CheckedRequest -Name "probe-health-$i" -Method "GET" -Url $healthUrl -Headers @{} -AllowedStatus @(200)
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $OutDir "staging-observability-check-$timestamp.json"
$results | ConvertTo-Json -Depth 6 | Set-Content -Path $outFile

Write-Host "OK: staging observability probes executed. Evidence: $outFile"
