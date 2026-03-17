param(
    [string]$ProjectPath = "C:\Users\Benyamin\OneDrive\Desktop\copilot-sdk-main\info-tech-gamer-storefront-build",
    [int[]]$Pids = @()
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ProjectPath)) {
    throw "Project path not found: $ProjectPath"
}

Write-Host "Project: $ProjectPath"

if ($Pids.Count -gt 0) {
    Write-Host "Stopping selected process IDs (restricted to node/npm/pnpm)..."
    $killed = @()

    foreach ($pid in $Pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction Stop
            if ($proc.ProcessName -notin @("node", "npm", "pnpm")) {
                Write-Warning "Skipping PID ${pid}: process '$($proc.ProcessName)' is not node/npm/pnpm."
                continue
            }

            Stop-Process -Id $pid -Force -ErrorAction Stop
            $killed += $pid
        } catch {
            Write-Warning "Could not stop PID ${pid}: $($_.Exception.Message)"
        }
    }

    if ($killed.Count -gt 0) {
        Write-Host "Stopped PIDs: $($killed -join ', ')"
    } else {
        Write-Host "No PID was stopped."
    }
} else {
    Write-Host "No -Pids provided, skipping process termination."
}

$nextPath = Join-Path $ProjectPath ".next"
$removedLocks = 0

if (Test-Path -LiteralPath $nextPath) {
    Write-Host "Cleaning .next lock files..."
    $locks = Get-ChildItem -Path $nextPath -Recurse -Force -Filter "*.lock" -ErrorAction SilentlyContinue
    foreach ($lock in $locks) {
        try {
            Remove-Item -LiteralPath $lock.FullName -Force -ErrorAction Stop
            $removedLocks++
        } catch {
            Write-Warning "Could not remove $($lock.FullName): $($_.Exception.Message)"
        }
    }
    Write-Host "Removed lock files: $removedLocks"
} else {
    Write-Host ".next not found, skipping lock cleanup."
}

Write-Host "Done."
