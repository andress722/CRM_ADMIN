param(
  [string]$CommentPath = "artifacts/staging/PR_EVIDENCE_COMMENT.md"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $CommentPath)) {
  throw "PR evidence comment not found: $CommentPath"
}

$content = (Get-Content -Raw $CommentPath).Replace('\\', '/')

$requiredPatterns = @(
  "## Staging Release Evidence",
  "Preflight:",
  "Smoke:",
  "artifacts/staging/RELEASE_EVIDENCE_INDEX.md",
  "artifacts/staging/STAGING_EVIDENCE_SUMMARY.md",
  "artifacts/staging/staging-preflight-latest.json",
  "artifacts/staging/staging-smoke-latest.json",
  "artifacts/staging/staging-release-evidence-latest.zip"
)

$missing = @()
foreach ($pattern in $requiredPatterns) {
  if ($content -notmatch [regex]::Escape($pattern)) {
    $missing += $pattern
  }
}

if ($missing.Count -gt 0) {
  $joined = ($missing -join ", ")
  throw "PR evidence comment missing required content: $joined"
}

Write-Host "PR evidence comment contains all required sections/artifact references."
