<#
.SYNOPSIS
  Monitors GitHub Actions for successful CI on the exact main commit and deploys that commit locally.
.PARAMETER IntervalSeconds
  Interval between checks in seconds (default: 30).
.PARAMETER RunOnce
  Check once and exit.
#>

[CmdletBinding()]
param (
    [ValidateRange(1, 86400)][int]$IntervalSeconds = 30,
    [switch]$RunOnce
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$DeployScript = Join-Path $PSScriptRoot 'deploy.ps1'
$Owner = 'HARSHITA-JETHANI'
$Repo = 'containerized-library-management'
$Branch = 'main'
$StateFile = Join-Path $ProjectRoot '.last_deployed_sha'
$FailedStateFile = Join-Path $ProjectRoot '.last_failed_sha'
$global:StopCdAgent = $false

function Read-StateFile([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    return (Get-Content -LiteralPath $Path -Raw).Trim()
}

$global:lastDeployedSha = Read-StateFile $StateFile
$lastFailedSha = Read-StateFile $FailedStateFile

function Check-And-Deploy {
    try {
        $headers = @{ 'User-Agent' = 'PowerShell-Local-CD-Agent' }
        $branchUrl = "https://api.github.com/repos/$Owner/$Repo/commits/$Branch"
        $branchResponse = Invoke-RestMethod -Uri $branchUrl -Method Get -Headers $headers -TimeoutSec 10 -ErrorAction Stop
        $latestCommitSha = [string]$branchResponse.sha
        if ($latestCommitSha -notmatch '^(?i:[0-9a-f]{40}|[0-9a-f]{64})$') {
            Write-Warning "GitHub returned an invalid or missing commit SHA for $Branch."
            return
        }

        if ($latestCommitSha -ceq $global:lastDeployedSha) {
            Write-Host "Up to date at commit $latestCommitSha."
            return
        }
        if ($latestCommitSha -ceq $script:lastFailedSha) {
            Write-Host "Commit $latestCommitSha previously failed deployment; automatic retry is suppressed."
            return
        }

        $localHeadOutput = & git -C $ProjectRoot rev-parse HEAD
        $gitExitCode = $LASTEXITCODE
        if ($gitExitCode -ne 0 -or $null -eq $localHeadOutput) {
            Write-Warning "Could not read local Git HEAD; deployment is skipped."
            return
        }
        $localHead = ([string]$localHeadOutput).Trim()
        if ($localHead -cne $latestCommitSha) {
            Write-Warning "Local HEAD does not exactly match GitHub main commit $latestCommitSha; deployment is skipped."
            return
        }

        $runsUrl = "https://api.github.com/repos/$Owner/$Repo/actions/runs?branch=$Branch&event=push&per_page=100"
        $runsResponse = Invoke-RestMethod -Uri $runsUrl -Method Get -Headers $headers -TimeoutSec 10 -ErrorAction Stop
        $matchingRun = @($runsResponse.workflow_runs | Where-Object {
            $_.head_sha -ceq $latestCommitSha -and $_.head_branch -ceq $Branch -and $_.event -ceq 'push'
        } | Select-Object -First 1)
        if ($matchingRun.Count -eq 0) {
            Write-Host "No CI run for exact commit $latestCommitSha is available yet."
            return
        }
        $run = $matchingRun[0]
        if ($run.status -cne 'completed' -or $run.conclusion -cne 'success') {
            Write-Host "CI is not successfully complete for $latestCommitSha (status=$($run.status), conclusion=$($run.conclusion)); deployment is skipped."
            return
        }

        Write-Host "CI succeeded for exact commit $latestCommitSha. Running local deployment without pulling or changing Git state."
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $DeployScript -SkipPull
        $deployExitCode = $LASTEXITCODE
        if ($deployExitCode -eq 0) {
            Set-Content -LiteralPath $StateFile -Value $latestCommitSha
            $global:lastDeployedSha = $latestCommitSha
            if (Test-Path -LiteralPath $FailedStateFile) { Remove-Item -LiteralPath $FailedStateFile }
            $script:lastFailedSha = ''
            Write-Host "Deployment succeeded for $latestCommitSha."
        } else {
            $script:lastFailedSha = $latestCommitSha
            Set-Content -LiteralPath $FailedStateFile -Value $latestCommitSha
            Write-Host "Deployment failed for $latestCommitSha (exit $deployExitCode). .last_deployed_sha was not updated; retry is suppressed." -ForegroundColor Red
        }
    } catch {
        Write-Host "CD agent check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Monitoring $Owner/$Repo ($Branch); press Ctrl+C to stop."
$cancelHandler = [ConsoleCancelEventHandler]{
    param($sender, $eventArgs)
    $eventArgs.Cancel = $true
    $global:StopCdAgent = $true
}
[Console]::add_CancelKeyPress($cancelHandler)
try {
    do {
        if ($global:StopCdAgent) { break }
        Check-And-Deploy
        if ($RunOnce -or $global:StopCdAgent) { break }
        for ($second = 0; $second -lt $IntervalSeconds -and -not $global:StopCdAgent; $second++) {
            Start-Sleep -Seconds 1
        }
    } while (-not $global:StopCdAgent)
} finally {
    [Console]::remove_CancelKeyPress($cancelHandler)
    Write-Host 'CD agent stopped.'
}
