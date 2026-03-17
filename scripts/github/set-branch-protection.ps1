param(
    [string]$Owner = "andress722",
    [string]$Repo = "CRM_ADMIN",
    [string[]]$Branches = @("main"),
    [switch]$EnforceAdmins = $true,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$token = $env:GH_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    $token = $env:GITHUB_TOKEN
}

if ([string]::IsNullOrWhiteSpace($token) -and -not $DryRun) {
    throw "Missing token. Set GH_TOKEN (or GITHUB_TOKEN) with repo admin scope."
}

$headers = @{
    Accept                   = "application/vnd.github+json"
    "X-GitHub-Api-Version"  = "2022-11-28"
}
if (-not [string]::IsNullOrWhiteSpace($token)) {
    $headers.Authorization = "Bearer $token"
}
elseif ($DryRun) {
    Write-Host "[DRY-RUN] No GH token provided; contexts will use defaults."
}

function Get-DefaultContexts {
    return @(
        "Admin BFF Security",
        "Storefront BFF Security"
    )
}

function Get-HttpStatusCode {
    param($Exception)
    if ($null -eq $Exception) { return $null }
    if ($Exception.PSObject.Properties.Name -contains 'Response' -and $Exception.Response -and $Exception.Response.StatusCode) {
        return [int]$Exception.Response.StatusCode
    }
    return $null
}

function Validate-TokenAndRepoAccess {
    param(
        [string]$Owner,
        [string]$Repo
    )

    if ($DryRun) {
        return
    }

    try {
        $me = Invoke-RestMethod -Method Get -Uri "https://api.github.com/user" -Headers $headers
        Write-Host "Authenticated as: $($me.login)"
    }
    catch {
        $status = Get-HttpStatusCode $_.Exception
        if ($status -eq 401) {
            throw "GitHub token rejected (401). Generate a new token and export GH_TOKEN."
        }
        throw
    }

    try {
        $repoInfo = Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/$Owner/$Repo" -Headers $headers
        Write-Host "Repository access OK: $($repoInfo.full_name)"
    }
    catch {
        $status = Get-HttpStatusCode $_.Exception
        if ($status -eq 404) {
            throw "Repository '$Owner/$Repo' not visible for this token (404). Check owner/repo name and token access grants."
        }
        if ($status -eq 403) {
            throw "Token cannot access repository metadata (403). Ensure token has repository access."
        }
        throw
    }
}

function Resolve-BffCheckContexts {
    param(
        [string]$Owner,
        [string]$Repo,
        [string]$Branch
    )

    try {
        $branchInfo = Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/$Owner/$Repo/branches/$Branch" -Headers $headers
        $sha = $branchInfo.commit.sha
        if ([string]::IsNullOrWhiteSpace($sha)) {
            return Get-DefaultContexts
        }

        $checks = Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/$Owner/$Repo/commits/$sha/check-runs?per_page=100" -Headers $headers
        if (-not $checks.check_runs) {
            return Get-DefaultContexts
        }

        $names = @(
            $checks.check_runs |
                Where-Object {
                    $_.app.slug -eq "github-actions" -and (
                        $_.name -eq "Admin BFF Security" -or $_.name -eq "Storefront BFF Security"
                    )
                } |
                Select-Object -ExpandProperty name -Unique
        )

        if ($names.Count -ge 2) {
            return $names
        }

        return Get-DefaultContexts
    }
    catch {
        Write-Warning "Could not infer contexts from branch '$Branch'. Falling back to defaults. $($_.Exception.Message)"
        return Get-DefaultContexts
    }
}

Validate-TokenAndRepoAccess -Owner $Owner -Repo $Repo

# Always ignore legacy branch names automatically.
$targetBranches = @($Branches | Where-Object { $_ -eq "main" } | Select-Object -Unique)
if ($targetBranches.Count -eq 0) {
    $targetBranches = @("main")
}

foreach ($branch in $targetBranches) {
    try {
        $contexts = if ([string]::IsNullOrWhiteSpace($token)) {
            Get-DefaultContexts
        }
        else {
            Resolve-BffCheckContexts -Owner $Owner -Repo $Repo -Branch $branch
        }

        $payload = @{
            required_status_checks = @{
                strict   = $true
                contexts = $contexts
            }
            enforce_admins                   = [bool]$EnforceAdmins
            required_pull_request_reviews    = $null
            restrictions                     = $null
            required_conversation_resolution = $true
            allow_force_pushes               = $false
            allow_deletions                  = $false
            block_creations                  = $false
        }

        $json = $payload | ConvertTo-Json -Depth 8

        if ($DryRun) {
            Write-Host "[DRY-RUN] Would apply protection on ${Owner}/${Repo}:${branch} with contexts: $($contexts -join ', ')"
            continue
        }

        Invoke-RestMethod -Method Put -Uri "https://api.github.com/repos/$Owner/$Repo/branches/$branch/protection" -Headers $headers -Body $json -ContentType "application/json"
        Write-Host "Applied protection on ${Owner}/${Repo}:${branch} with contexts: $($contexts -join ', ')"
    }
    catch {
        $status = Get-HttpStatusCode $_.Exception
        if ($status -eq 404) {
            Write-Warning "Branch '$branch' not found or inaccessible. Skipping."
            continue
        }
        if ($status -eq 401) {
            throw "Unauthorized (401) while setting protection. Token invalid/expired or missing required permissions."
        }
        if ($status -eq 403) {
            throw "Forbidden (403) while setting protection. Token needs admin permission to repository rules/branch protection."
        }

        throw
    }
}
