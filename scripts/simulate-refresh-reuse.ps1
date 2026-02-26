# Simulate refresh token reuse detection
# 1) Login -> capture refresh_token cookie (old)
# 2) Call /auth/refresh with the cookie -> server rotates: issues new cookie (new)
# 3) Replay the old cookie value against /auth/refresh -> server should detect reuse and revoke all sessions

param(
    [string]$ApiBase = "http://localhost:5071/api/v1/auth",
    [string]$Email = "admin@example.com",
    [string]$Password = "demo123"
)

Write-Host "API base: $ApiBase"

function Extract-CookieValue($response, $cookieName) {
    $setCookieHeaders = $response.Headers['Set-Cookie']
    if (-not $setCookieHeaders) { return $null }
    if ($setCookieHeaders -is [System.Array]) {
        foreach ($h in $setCookieHeaders) {
            if ($h -match "$cookieName=([^;]+)") { return $Matches[1] }
        }
    } else {
        if ($setCookieHeaders -match "$cookieName=([^;]+)") { return $Matches[1] }
    }
    return $null
}

# 1) Login
$loginUrl = "$ApiBase/login"
$body = @{ email = $Email; password = $Password } | ConvertTo-Json
$resp = Invoke-WebRequest -Uri $loginUrl -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -ErrorAction Stop
$oldRefresh = Extract-CookieValue $resp 'refresh_token'
Write-Host "Login completed. Old refresh token captured (redacted)."

if (-not $oldRefresh) { Write-Error "No refresh_token cookie found on login."; exit 1 }

# 2) Call refresh normally (server rotates)
$refreshUrl = "$ApiBase/refresh"
$headers = @{ Cookie = "refresh_token=$oldRefresh" }
$resp2 = Invoke-WebRequest -Uri $refreshUrl -Method Post -Headers $headers -UseBasicParsing -ErrorAction Stop
$newRefresh = Extract-CookieValue $resp2 'refresh_token'
Write-Host "Refresh called. New refresh token captured (redacted)."

if (-not $newRefresh) { Write-Error "No new refresh_token cookie found after refresh."; exit 1 }

# 3) Replay old (now revoked) refresh token to trigger reuse detection
$headersOld = @{ Cookie = "refresh_token=$oldRefresh" }
try {
    $resp3 = Invoke-WebRequest -Uri $refreshUrl -Method Post -Headers $headersOld -UseBasicParsing -ErrorAction Stop
    Write-Host "Unexpected success when replaying old token. Response: $($resp3.StatusCode)"
} catch {
    $err = $_.Exception.Response
    if ($err) {
        $status = $err.StatusCode.Value__
        Write-Host "Replay returned status: $status"
        $body = (New-Object System.IO.StreamReader($err.GetResponseStream())).ReadToEnd()
        Write-Host "Body: $body"
    } else {
        Write-Host "Replay failed: $_"
    }
}

Write-Host "Simulation complete. Check DB for revoked tokens or call admin endpoints to verify."
