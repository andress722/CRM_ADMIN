param(
  [string]$StagingArtifactsDir = "artifacts/staging",
  [string]$OutputDir = "artifacts/staging",
  [string]$BundlePrefix = "staging-release-evidence"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $StagingArtifactsDir)) {
  throw "Staging artifacts directory not found: $StagingArtifactsDir"
}

if (-not (Test-Path $OutputDir)) {
  New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null
}

function Get-LatestFile {
  param(
    [string]$Pattern,
    [string]$BaseDir
  )

  $file = Get-ChildItem -Path $BaseDir -Filter $Pattern -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  return $file
}

$latestPreflight = Get-LatestFile -Pattern "staging-preflight-*.json" -BaseDir $StagingArtifactsDir
$latestSmoke = Get-LatestFile -Pattern "staging-smoke-*.json" -BaseDir $StagingArtifactsDir
$summaryFile = Join-Path $StagingArtifactsDir "STAGING_EVIDENCE_SUMMARY.md"

$observabilityArtifactsDir = "artifacts/observability"
$latestObservability = if (Test-Path $observabilityArtifactsDir) {
  Get-LatestFile -Pattern "staging-observability-check-*.json" -BaseDir $observabilityArtifactsDir
}
else {
  $null
}

$docsFiles = @(
  "docs/STAGING_RELEASE_EVIDENCE.md",
  "docs/ADMIN_RELEASE_CHECKLIST.md",
  "docs/CRM_OPERATIONS_RUNBOOK.md",
  "docs/observability/INCIDENT_RUNBOOK.md",
  "docs/observability/alert-rules.prometheus.yml"
)

$filesToBundle = New-Object System.Collections.Generic.List[string]
if ($latestPreflight) { $filesToBundle.Add($latestPreflight.FullName) }
if ($latestSmoke) { $filesToBundle.Add($latestSmoke.FullName) }
if ($latestObservability) { $filesToBundle.Add($latestObservability.FullName) }
if (Test-Path $summaryFile) { $filesToBundle.Add((Resolve-Path $summaryFile).Path) }

foreach ($doc in $docsFiles) {
  if (Test-Path $doc) {
    $filesToBundle.Add((Resolve-Path $doc).Path)
  }
}

if ($filesToBundle.Count -eq 0) {
  throw "No evidence files found to bundle."
}

$smokePassed = "unknown"
$smokeFailedChecks = "n/a"
$preflightPassed = "unknown"
$opsOverviewStatus = "n/a"
$observabilityPassed = "unknown"

if ($latestSmoke) {
  $smokeObj = Get-Content -Raw $latestSmoke.FullName | ConvertFrom-Json
  $smokePassed = [string]$smokeObj.passed
  $smokeFailedChecks = [string]$smokeObj.failedChecks

  $opsCheck = @($smokeObj.checks | Where-Object { $_.name -eq "Admin ops overview" } | Select-Object -First 1)
  if ($opsCheck.Count -gt 0) {
    $opsOverviewStatus = if ($opsCheck[0].passed) { "passed" } else { "failed" }
  }
}

if ($latestPreflight) {
  $preflightObj = Get-Content -Raw $latestPreflight.FullName | ConvertFrom-Json
  $preflightPassed = [string]$preflightObj.passed
}

if ($latestObservability) {
  $observabilityObj = Get-Content -Raw $latestObservability.FullName | ConvertFrom-Json
  $observabilityPassed = [string]$observabilityObj.passed
}

$indexPath = Join-Path $OutputDir "RELEASE_EVIDENCE_INDEX.md"
$nowUtc = (Get-Date).ToUniversalTime().ToString("o")

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# Release Evidence Index")
$lines.Add("")
$lines.Add("- Generated at (UTC): $nowUtc")
$lines.Add("- Preflight passed: $preflightPassed")
$lines.Add("- Smoke passed: $smokePassed")
$lines.Add("- Smoke failed checks: $smokeFailedChecks")
$lines.Add("- Admin ops overview smoke: $opsOverviewStatus")
$lines.Add("- Observability probe passed: $observabilityPassed")
$lines.Add("")
$lines.Add("## Included Files")

foreach ($f in $filesToBundle | Select-Object -Unique) {
  $resolved = (Resolve-Path $f).Path
  $relative = [System.IO.Path]::GetRelativePath((Resolve-Path .).Path, $resolved)
  $lines.Add("- $relative")
}

$lines -join "`r`n" | Set-Content -Path $indexPath
$filesToBundle.Add((Resolve-Path $indexPath).Path)

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$zipPath = Join-Path $OutputDir "$BundlePrefix-$timestamp.zip"
$latestZipPath = Join-Path $OutputDir "$BundlePrefix-latest.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $latestZipPath) { Remove-Item $latestZipPath -Force }

Compress-Archive -Path ($filesToBundle | Select-Object -Unique) -DestinationPath $zipPath -CompressionLevel Optimal
Copy-Item -Path $zipPath -Destination $latestZipPath -Force

Write-Host "Release evidence index: $indexPath"
Write-Host "Release evidence bundle: $zipPath"
Write-Host "Latest release evidence bundle: $latestZipPath"
