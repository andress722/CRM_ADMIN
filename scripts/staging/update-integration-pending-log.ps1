param(
  [string]$LogPath = "docs/INTEGRATION_PENDING_LOG.md",
  [string]$ArtifactsDir = "artifacts/staging"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LogPath)) {
  throw "Integration log not found: $LogPath"
}

$preflight = Get-ChildItem -Path $ArtifactsDir -Filter "staging-preflight-*.json" -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$smoke = Get-ChildItem -Path $ArtifactsDir -Filter "staging-smoke-*.json" -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("## Automated Status (Generated)")
$lines.Add("- Updated at (UTC): $((Get-Date).ToUniversalTime().ToString('o'))")

if ($preflight) {
  $preflightObj = Get-Content -Raw $preflight.FullName | ConvertFrom-Json
  $lines.Add("- Latest preflight: $([System.IO.Path]::GetFileName($preflight.FullName)) (passed=$($preflightObj.passed), failedChecks=$($preflightObj.failedChecks))")
  foreach ($check in @($preflightObj.checks | Where-Object { -not $_.passed })) {
    $lines.Add("  - Preflight fail: $($check.name) [$($check.classification)] status=$($check.statusCode)")
  }
}
else {
  $lines.Add("- Latest preflight: not found")
}

if ($smoke) {
  $smokeObj = Get-Content -Raw $smoke.FullName | ConvertFrom-Json
  $lines.Add("- Latest smoke: $([System.IO.Path]::GetFileName($smoke.FullName)) (passed=$($smokeObj.passed), failedChecks=$($smokeObj.failedChecks), totalChecks=$($smokeObj.totalChecks))")
  foreach ($check in @($smokeObj.checks | Where-Object { -not $_.passed })) {
    $lines.Add("  - Smoke fail: $($check.name) status=$($check.statusCode)")
  }
}
else {
  $lines.Add("- Latest smoke: not found")
}

$start = "<!-- AUTO_STATUS_START -->"
$end = "<!-- AUTO_STATUS_END -->"
$section = $lines -join "`r`n"
$autoBlock = "$start`r`n$section`r`n$end"

$content = Get-Content -Raw $LogPath
$startIndex = $content.IndexOf($start)
$endIndex = $content.IndexOf($end)

if ($startIndex -ge 0 -and $endIndex -gt $startIndex) {
  $prefix = $content.Substring(0, $startIndex)
  $suffixStart = $endIndex + $end.Length
  $suffix = $content.Substring($suffixStart)
  $updated = $prefix + $autoBlock + $suffix
}
else {
  $updated = $content.TrimEnd() + "`r`n`r`n" + $autoBlock + "`r`n"
}

Set-Content -Path $LogPath -Value $updated
Write-Host "Updated integration pending log auto-status: $LogPath"
