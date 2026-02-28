param(
  [Parameter(Mandatory = $true)]
  [string]$SmokeJsonPath,
  [string]$OutputPath = "artifacts/staging/STAGING_EVIDENCE_SUMMARY.md"
)

$ErrorActionPreference = "Stop"

try {
  $resolvedSmokePath = (Resolve-Path -Path $SmokeJsonPath).Path
}
catch {
  throw "Smoke JSON not found: $SmokeJsonPath"
}

$smoke = Get-Content -Raw $resolvedSmokePath | ConvertFrom-Json
$checks = @($smoke.checks)
$executedAt = if ($smoke.executedAtUtc -is [datetime]) {
  ([datetime]$smoke.executedAtUtc).ToUniversalTime().ToString("o")
}
else {
  [string]$smoke.executedAtUtc
}

$requiredMap = @(
  @{ Name = "API health"; Label = "API /health" },
  @{ Name = "API root"; Label = "API /" },
  @{ Name = "API metrics endpoint reachable"; Label = "API /metrics" },
  @{ Name = "Admin login page"; Label = "Admin /login" },
  @{ Name = "Storefront home"; Label = "Storefront /" },
  @{ Name = "Admin API login"; Label = "Admin API login" },
  @{ Name = "Admin CRM leads list"; Label = "CRM leads list" }
)

if ($smoke.runCrmCrud -eq $true) {
  $requiredMap += @(
    @{ Name = "Admin CRM lead create"; Label = "CRM lead create" },
    @{ Name = "Admin CRM lead update"; Label = "CRM lead update" },
    @{ Name = "Admin CRM lead delete"; Label = "CRM lead delete" }
  )
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# Staging Evidence Summary")
$lines.Add("")
$lines.Add("- Generated at (UTC): $((Get-Date).ToUniversalTime().ToString('o'))")
$lines.Add("- Smoke executed at (UTC): $executedAt")
$lines.Add("- API URL: $($smoke.apiBaseUrl)")
$lines.Add("- Admin URL: $($smoke.adminBaseUrl)")
$lines.Add("- Storefront URL: $($smoke.storefrontBaseUrl)")
$lines.Add("- CRM CRUD checks enabled: $($smoke.runCrmCrud)")
$lines.Add("- Result: passed=$($smoke.passed), failedChecks=$($smoke.failedChecks), totalChecks=$($smoke.totalChecks)")
$lines.Add("")
$lines.Add("## Required Checks")

foreach ($entry in $requiredMap) {
  $check = $checks | Where-Object { $_.name -eq $entry.Name } | Select-Object -First 1
  if ($null -eq $check) {
    $lines.Add("- [ ] $($entry.Label): missing check in artifact")
    continue
  }

  if ($check.passed) {
    $lines.Add("- [x] $($entry.Label): $($check.details)")
  }
  else {
    $lines.Add("- [ ] $($entry.Label): $($check.details)")
  }
}

$lines.Add("")
$lines.Add("## All Checks")
foreach ($check in $checks) {
  $icon = if ($check.passed) { "x" } else { " " }
  $lines.Add("- [$icon] $($check.name): status=$($check.statusCode), details=$($check.details)")
}

$dir = Split-Path -Path $OutputPath -Parent
if (-not [string]::IsNullOrWhiteSpace($dir) -and -not (Test-Path $dir)) {
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

$lines -join "`r`n" | Set-Content -Path $OutputPath
Write-Host "Generated evidence summary: $OutputPath"
