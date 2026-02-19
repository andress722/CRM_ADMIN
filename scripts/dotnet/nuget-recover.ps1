param(
  [string]$Solution = "src\Ecommerce.sln",
  [switch]$ClearCache,
  [switch]$UseSerialRestore = $true
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$solutionPath = Join-Path $repoRoot $Solution
$nugetConfigPath = Join-Path $repoRoot "NuGet.config"

Write-Host "==> Repository root: $repoRoot"
Write-Host "==> Solution: $solutionPath"
Write-Host "==> NuGet config: $nugetConfigPath"

if ($ClearCache) {
  Write-Host "`n==> Clearing NuGet caches"
  dotnet nuget locals all --clear
}

$restoreArgs = @("restore", $solutionPath, "--configfile", $nugetConfigPath, "-v", "minimal")
if ($UseSerialRestore) {
  $restoreArgs += @("-m:1", "/p:RestoreDisableParallel=true")
}

Write-Host "`n==> Running restore"
dotnet @restoreArgs

Write-Host "`n==> Restore succeeded"
