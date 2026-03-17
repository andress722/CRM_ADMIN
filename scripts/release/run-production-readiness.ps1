param(
  [string]$OutDir = "artifacts/readiness",
  [switch]$SkipAdminBuild,
  [switch]$SkipApiTests,
  [switch]$SkipAdminE2E,
  [switch]$IncludeStorefrontBuild,
  [switch]$RunStagingSmoke,
  [switch]$RunObservabilityCheck,
  [switch]$ApplyBranchProtection,
  [string]$ApiBaseUrl = "",
  [string]$AdminBaseUrl = "",
  [string]$StorefrontBaseUrl = "",
  [string]$AdminEmail = "",
  [string]$AdminPassword = "",
  [string]$AdminBearerToken = "",
  [string]$BranchOwner = "andress722",
  [string]$BranchRepo = "CRM_ADMIN",
  [string]$BranchName = "main"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function New-StepResult {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Details
  )

  return [PSCustomObject]@{
    name = $Name
    passed = $Passed
    details = $Details
    checkedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  }
}

function Invoke-Step {
  param(
    [string]$Name,
    [ScriptBlock]$Action
  )

  try {
    & $Action
    return (New-StepResult -Name $Name -Passed $true -Details "ok")
  }
  catch {
    return (New-StepResult -Name $Name -Passed $false -Details $_.Exception.Message)
  }
}

function Invoke-ExternalStep {
  param(
    [string]$Name,
    [string]$WorkingDir,
    [string]$FilePath,
    [string[]]$Arguments
  )

  return Invoke-Step -Name $Name -Action {
    Push-Location $WorkingDir
    try {
      & $FilePath @Arguments
      if ($LASTEXITCODE -ne 0) {
        throw "Command exited with code $LASTEXITCODE"
      }
    }
    finally {
      Pop-Location
    }
  }
}

function Resolve-AdminBearerToken {
  param(
    [string]$ApiBaseUrl,
    [string]$AdminEmail,
    [string]$AdminPassword
  )

  $api = $ApiBaseUrl.Trim().TrimEnd('/')
  $payload = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
  $response = Invoke-RestMethod -Uri "$api/api/v1/auth/login" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 20 -ErrorAction Stop
  $token = [string]$response.accessToken
  if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Login succeeded but accessToken was not returned."
  }

  return $token
}

New-Item -ItemType Directory -Force -Path (Join-Path $root $OutDir) | Out-Null

$results = New-Object System.Collections.Generic.List[object]
$resolvedAdminBearerToken = $AdminBearerToken

$results.Add((Invoke-ExternalStep -Name "API build" -WorkingDir $root -FilePath "dotnet" -Arguments @("build", "src/Ecommerce.sln", "--no-restore", "-v", "minimal")))

if (-not $SkipApiTests.IsPresent) {
  $results.Add((Invoke-ExternalStep -Name "API tests" -WorkingDir $root -FilePath "dotnet" -Arguments @("test", "tests/Ecommerce.API.Tests/Ecommerce.API.Tests.csproj", "-v", "minimal")))
}

if (-not $SkipAdminBuild.IsPresent) {
  $results.Add((Invoke-ExternalStep -Name "Admin build" -WorkingDir (Join-Path $root "admin-frontend") -FilePath "npm" -Arguments @("run", "build")))
}

if (-not $SkipAdminE2E.IsPresent) {
  $results.Add((Invoke-ExternalStep -Name "Admin BFF security" -WorkingDir (Join-Path $root "admin-frontend") -FilePath "npm" -Arguments @("run", "test:bff-security")))
  $results.Add((Invoke-ExternalStep -Name "Admin CRM critical" -WorkingDir (Join-Path $root "admin-frontend") -FilePath "npm" -Arguments @("run", "test:crm-critical")))
}

if ($IncludeStorefrontBuild.IsPresent) {
  $results.Add((Invoke-ExternalStep -Name "Storefront build" -WorkingDir (Join-Path $root "info-tech-gamer-storefront-build") -FilePath "npm" -Arguments @("run", "build")))
}

if ($RunStagingSmoke.IsPresent) {
  if ([string]::IsNullOrWhiteSpace($ApiBaseUrl) -or [string]::IsNullOrWhiteSpace($AdminBaseUrl) -or [string]::IsNullOrWhiteSpace($StorefrontBaseUrl)) {
    $results.Add((New-StepResult -Name "Staging smoke" -Passed $false -Details "ApiBaseUrl/AdminBaseUrl/StorefrontBaseUrl are required"))
  }
  else {
    $args = @(
      "-File", (Join-Path $root "scripts/staging/run-staging-smoke.ps1"),
      "-ApiBaseUrl", $ApiBaseUrl,
      "-AdminBaseUrl", $AdminBaseUrl,
      "-StorefrontBaseUrl", $StorefrontBaseUrl,
      "-OutDir", "artifacts/staging"
    )

    if (-not [string]::IsNullOrWhiteSpace($AdminEmail) -and -not [string]::IsNullOrWhiteSpace($AdminPassword)) {
      $args += @("-AdminEmail", $AdminEmail, "-AdminPassword", $AdminPassword)
    }

    $results.Add((Invoke-ExternalStep -Name "Staging smoke" -WorkingDir $root -FilePath "pwsh" -Arguments $args))
  }
}

if ($RunObservabilityCheck.IsPresent) {
  if ([string]::IsNullOrWhiteSpace($resolvedAdminBearerToken) -and -not [string]::IsNullOrWhiteSpace($ApiBaseUrl) -and -not [string]::IsNullOrWhiteSpace($AdminEmail) -and -not [string]::IsNullOrWhiteSpace($AdminPassword)) {
    try {
      $resolvedAdminBearerToken = Resolve-AdminBearerToken -ApiBaseUrl $ApiBaseUrl -AdminEmail $AdminEmail -AdminPassword $AdminPassword
      $results.Add((New-StepResult -Name "Admin token bootstrap" -Passed $true -Details "accessToken issued via /api/v1/auth/login"))
    }
    catch {
      $results.Add((New-StepResult -Name "Admin token bootstrap" -Passed $false -Details $_.Exception.Message))
    }
  }

  if ([string]::IsNullOrWhiteSpace($ApiBaseUrl) -or [string]::IsNullOrWhiteSpace($resolvedAdminBearerToken)) {
    $results.Add((New-StepResult -Name "Staging observability check" -Passed $false -Details "ApiBaseUrl and AdminBearerToken are required"))
  }
  else {
    $results.Add((Invoke-ExternalStep -Name "Staging observability check" -WorkingDir $root -FilePath "pwsh" -Arguments @(
      "-File", (Join-Path $root "scripts/observability/run-staging-observability-check.ps1"),
      "-ApiBaseUrl", $ApiBaseUrl,
      "-AdminBearerToken", $resolvedAdminBearerToken,
      "-OutDir", "artifacts/observability"
    )))
  }
}

if ($ApplyBranchProtection.IsPresent) {
  $results.Add((Invoke-ExternalStep -Name "Branch protection apply" -WorkingDir $root -FilePath "pwsh" -Arguments @(
    "-File", (Join-Path $root "scripts/github/set-branch-protection.ps1"),
    "-Owner", $BranchOwner,
    "-Repo", $BranchRepo,
    "-Branches", $BranchName
  )))
}
else {
  $results.Add((Invoke-ExternalStep -Name "Branch protection dry-run" -WorkingDir $root -FilePath "pwsh" -Arguments @(
    "-File", (Join-Path $root "scripts/github/set-branch-protection.ps1"),
    "-Owner", $BranchOwner,
    "-Repo", $BranchRepo,
    "-Branches", $BranchName,
    "-DryRun"
  )))
}

$failed = @($results | Where-Object { -not $_.passed })
$summary = [PSCustomObject]@{
  executedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  totalChecks = $results.Count
  failedChecks = $failed.Count
  passed = ($failed.Count -eq 0)
  checks = $results
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$outPath = Join-Path (Join-Path $root $OutDir) "production-readiness-$timestamp.json"
$latestPath = Join-Path (Join-Path $root $OutDir) "production-readiness-latest.json"

$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $outPath
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $latestPath

Write-Host "Production readiness report: $outPath"
Write-Host "Latest report: $latestPath"

foreach ($item in $results) {
  $prefix = if ($item.passed) { "OK" } else { "FAIL" }
  Write-Host "[$prefix] $($item.name) -> $($item.details)"
}

if ($failed.Count -gt 0) {
  throw "Production readiness failed with $($failed.Count) failing checks."
}

