param(
  [string]$IndexPath = "artifacts/staging/RELEASE_EVIDENCE_INDEX.md",
  [string]$SummaryPath = "artifacts/staging/STAGING_EVIDENCE_SUMMARY.md",
  [string]$PreflightPath = "artifacts/staging/staging-preflight-latest.json",
  [string]$SmokePath = "artifacts/staging/staging-smoke-latest.json",
  [string]$OutputPath = "artifacts/staging/PR_EVIDENCE_COMMENT.md"
)

$ErrorActionPreference = "Stop"

$workspace = (Resolve-Path .).Path

function Read-JsonIfExists {
  param([string]$Path)
  if (Test-Path $Path) {
    return Get-Content -Raw $Path | ConvertFrom-Json
  }
  return $null
}

$preflight = Read-JsonIfExists -Path $PreflightPath
$smoke = Read-JsonIfExists -Path $SmokePath

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("## Staging Release Evidence")
$lines.Add("")
$lines.Add("- Generated at (UTC): $((Get-Date).ToUniversalTime().ToString('o'))")

if ($preflight) {
  $lines.Add("- Preflight: passed=$($preflight.passed), failedChecks=$($preflight.failedChecks)")
}
else {
  $lines.Add("- Preflight: artifact not found")
}

if ($smoke) {
  $lines.Add("- Smoke: passed=$($smoke.passed), failedChecks=$($smoke.failedChecks), totalChecks=$($smoke.totalChecks)")
}
else {
  $lines.Add("- Smoke: artifact not found")
}

$lines.Add("")
$lines.Add("### Artifacts")

$artifactFiles = @($IndexPath, $SummaryPath, $PreflightPath, $SmokePath, "artifacts/staging/staging-release-evidence-latest.zip")
foreach ($file in $artifactFiles) {
  if (Test-Path $file) {
    $full = (Resolve-Path $file).Path
    $rel = ([System.IO.Path]::GetRelativePath($workspace, $full)).Replace([System.IO.Path]::DirectorySeparatorChar, "/")
    $lines.Add("- $rel")
  }
}

if (Test-Path $IndexPath) {
  $lines.Add("")
  $lines.Add("### Index Snapshot")
  $lines.Add("")
  $lines.Add('```markdown')
  $indexContent = Get-Content -Raw $IndexPath
  $lines.Add($indexContent.TrimEnd())
  $lines.Add('```')
}

$dir = Split-Path -Path $OutputPath -Parent
if (-not [string]::IsNullOrWhiteSpace($dir) -and -not (Test-Path $dir)) {
  New-Item -Path $dir -ItemType Directory -Force | Out-Null
}

$lines -join "`r`n" | Set-Content -Path $OutputPath
Write-Host "Generated PR comment markdown: $OutputPath"


