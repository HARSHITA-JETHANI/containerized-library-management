<#
.SYNOPSIS
  Automated Local Continuous Deployment (CD) Agent.
.DESCRIPTION
  Periodically queries the official GitHub Actions API for workflow runs on 'main'.
  Validates that the latest commit on 'main' has a completed and successful CI run before
  triggering deployment. Handles GitHub API rate limits, transient network errors, and
  graceful termination (Ctrl+C).
.PARAMETER IntervalSeconds
  Interval between checks in seconds (default: 30).
.PARAMETER RunOnce
  Check once and exit.
#>

[CmdletBinding()]
param (
    [int]$IntervalSeconds = 30,
    [switch]$RunOnce
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "E:\Harshi\7th SEM\CLOUD AUTOMATION\LibraryManagement"
Set-Location $ProjectRoot

$Owner = "HARSHITA-JETHANI"
$Repo = "containerized-library-management"
$Branch = "main"
$StateFile = Join-Path $ProjectRoot ".last_deployed_sha"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Automated Local Continuous Deployment (CD) Agent" -ForegroundColor Cyan
Write-Host " Monitoring: $Owner/$Repo (Branch: $Branch)" -ForegroundColor Cyan
Write-Host " Polling Interval: $IntervalSeconds seconds" -ForegroundColor Cyan
Write-Host " Stop Agent: Press Ctrl+C in this terminal window" -ForegroundColor Cyan
Write-Host " Target Application: http://localhost:5173" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Read previously deployed commit
$lastDeployedSha = ""
if (Test-Path $StateFile) {
    $lastDeployedSha = (Get-Content $StateFile -Raw).Trim()
} else {
    $currentHead = (git rev-parse HEAD).Trim()
    $lastDeployedSha = $currentHead
    Set-Content -Path $StateFile -Value $lastDeployedSha
}
Write-Host "Currently deployed commit SHA: $lastDeployedSha" -ForegroundColor Gray

function Check-And-Deploy {
    try {
        $headers = @{ "User-Agent" = "PowerShell-Local-CD-Agent" }

        # Step 1: Check what is the absolute latest commit on the remote 'main' branch
        $branchApiUrl = "https://api.github.com/repos/$Owner/$Repo/commits/$Branch"
        $branchResp = $null
        try {
            $branchResp = Invoke-RestMethod -Uri $branchApiUrl -Method Get -Headers $headers -TimeoutSec 10 -ErrorAction Stop
        } catch {
            $status = $_.Exception.Response.StatusCode.value__
            if ($status -eq 403) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] GitHub API rate limit reached. Waiting for next window..." -ForegroundColor Yellow
                return
            }
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Network/API error fetching branch head: $($_.Exception.Message)" -ForegroundColor Red
            return
        }

        $latestCommitSha = $branchResp.sha
        if (-not $latestCommitSha) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Could not determine latest commit on $Branch." -ForegroundColor Yellow
            return
        }

        # Step 2: If the latest commit is already deployed, we are fully up to date
        if ($latestCommitSha -eq $global:lastDeployedSha) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Up to date. Latest commit on $Branch is already deployed: $($latestCommitSha.Substring(0,7))" -ForegroundColor DarkGray
            return
        }

        # Step 3: Latest commit on remote 'main' is newer than last deployed.
        # Now query GitHub Actions to check if CI for THIS specific commit completed with 'success'
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Newer commit detected on ${Branch}: $($latestCommitSha.Substring(0,7)). Checking CI status..." -ForegroundColor Yellow

        $runsApiUrl = "https://api.github.com/repos/$Owner/$Repo/actions/runs?branch=$Branch&event=push&per_page=10"
        $runsResp = Invoke-RestMethod -Uri $runsApiUrl -Method Get -Headers $headers -TimeoutSec 10 -ErrorAction Stop

        # Find the workflow run specifically matching this commit SHA
        $matchingRun = $null
        foreach ($run in $runsResp.workflow_runs) {
            if ($run.head_sha -eq $latestCommitSha) {
                $matchingRun = $run
                break
            }
        }

        if (-not $matchingRun) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] CI run for commit $($latestCommitSha.Substring(0,7)) has not started or is queued on GitHub. Waiting..." -ForegroundColor Yellow
            return
        }

        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] CI Run ID: $($matchingRun.id) | Status: $($matchingRun.status) | Conclusion: $($matchingRun.conclusion)" -ForegroundColor Gray

        if ($matchingRun.status -ne "completed") {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] CI for commit $($latestCommitSha.Substring(0,7)) is currently '$($matchingRun.status)'. Waiting for completion before deploying..." -ForegroundColor Yellow
            return
        }

        if ($matchingRun.conclusion -ne "success") {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] CI for commit $($latestCommitSha.Substring(0,7)) completed with conclusion '$($matchingRun.conclusion)'. Deployment BLOCKED." -ForegroundColor Red
            return
        }

        # CI has passed for the latest commit on main! Trigger deployment
        Write-Host "`n==========================================================" -ForegroundColor Green
        Write-Host "[NEW VERIFIED CI COMMIT DETECTED]" -ForegroundColor Green
        Write-Host "Run ID: $($matchingRun.id)" -ForegroundColor Yellow
        Write-Host "Verified Commit: $latestCommitSha" -ForegroundColor Yellow
        Write-Host "Triggering automated local deployment..." -ForegroundColor Green
        Write-Host "==========================================================" -ForegroundColor Green

        & powershell -ExecutionPolicy Bypass -File "scripts/deploy.ps1"
        if ($LASTEXITCODE -eq 0) {
            $global:lastDeployedSha = $latestCommitSha
            Set-Content -Path $StateFile -Value $latestCommitSha
            Write-Host "[DEPLOYMENT SUCCESS] Successfully deployed commit $latestCommitSha`n" -ForegroundColor Green
        } else {
            Write-Host "[DEPLOYMENT FAILURE] deploy.ps1 exited with code $LASTEXITCODE. State file not updated.`n" -ForegroundColor Red
        }

    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Unexpected error in CD agent: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main polling loop
do {
    Check-And-Deploy
    if ($RunOnce) { break }
    Start-Sleep -Seconds $IntervalSeconds
} while ($true)
