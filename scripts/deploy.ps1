<#
.SYNOPSIS
  Automated Local Deployment Script for Containerized Library Management System.
.DESCRIPTION
  Safely pulls latest code on main, verifies working tree cleanliness, checks environment,
  creates an immutable database snapshot, tags previous Docker images for instant rollback,
  rebuilds Docker images, updates containers via Docker Compose, performs thorough health/functional
  checks, and automatically rolls back Docker images if health checks fail.
.PARAMETER ForceRebuild
  Forces a full rebuild of both frontend and backend Docker images.
.PARAMETER SkipPull
  Skips 'git pull' (useful for testing local commits before pushing).
.PARAMETER DryRun
  Validates deployment, Docker, Compose, and configuration prerequisites without making changes.
#>

[CmdletBinding()]
param (
    [switch]$ForceRebuild,
    [switch]$SkipPull,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$EnvPath = Join-Path $ProjectRoot ".env"
$DatabasePath = Join-Path $ProjectRoot "library.db"
$previousBackendAvailable = $false
$previousFrontendAvailable = $false
$deploymentUpdateAttempted = $false

function Write-Step {
    param([string]$Message)
    Write-Host "`n====> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Get-GitOutput {
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowEmptyOutput
    )
    $output = & git -C $ProjectRoot @Arguments
    $gitExitCode = $LASTEXITCODE
    if ($gitExitCode -ne 0) {
        throw "Git command failed (exit $gitExitCode): git $($Arguments -join ' ')"
    }
    if ($null -eq $output -and -not $AllowEmptyOutput) {
        throw "Git command returned no output: git $($Arguments -join ' ')"
    }
    if ($null -eq $output) { return "" }
    return [string]::Join("`n", [string[]]@($output))
}

function Invoke-ImageRollback {
    param([bool]$BackendAvailable, [bool]$FrontendAvailable)
    Write-Step "Rolling back Docker images after deployment failure"
    if (-not $BackendAvailable -or -not $FrontendAvailable) {
        throw "A complete previous backend/frontend image pair is unavailable; automatic rollback cannot safely proceed."
    }
    docker tag librarymanagement-backend:previous librarymanagement-backend:latest
    if ($LASTEXITCODE -ne 0) { throw "Failed to restore the previous backend image tag." }
    docker tag librarymanagement-frontend:previous librarymanagement-frontend:latest
    if ($LASTEXITCODE -ne 0) { throw "Failed to restore the previous frontend image tag." }
    docker compose --project-directory $ProjectRoot --project-name librarymanagement up -d
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed while restarting rollback images." }
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        try {
            $rollbackHealth = Invoke-RestMethod -Uri "http://localhost:5173/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
            if ($null -ne $rollbackHealth -and $rollbackHealth.status -eq 'ok') { break }
        } catch { }
        if ($attempt -eq 14) { throw "Previous images restarted, but the API did not become healthy after rollback." }
        Start-Sleep -Seconds 2
    }
    Write-Success "Rollback image restart completed. Database was not modified."
}

try {
    Write-Step "Step 1: Pre-deployment Environment & Database Check"

    if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
        throw "Project root was not found: $ProjectRoot"
    }

    # Validate .env without displaying its contents or secret.
    if (-not (Test-Path -LiteralPath $EnvPath -PathType Leaf)) {
        throw "Root .env file is missing. Please create .env with JWT_SECRET."
    }
    $jwtSecret = $null
    foreach ($envLine in (Get-Content -LiteralPath $EnvPath -Raw) -split "\r?\n") {
        $trimmedLine = $envLine.Trim()
        if (-not $trimmedLine -or $trimmedLine.StartsWith("#")) { continue }
        if ($trimmedLine -match '^JWT_SECRET\s*=\s*(.*?)\s*$') {
            $jwtSecret = $Matches[1].Trim().Trim('"').Trim("'").Trim()
            break
        }
    }
    if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
        throw "JWT_SECRET is missing or empty in .env. Deployment aborted."
    }
    Remove-Variable jwtSecret

    # Verify SQLite database file exists before any deployment.
    if (-not (Test-Path -LiteralPath $DatabasePath -PathType Leaf)) {
        throw "library.db was not found in project root. Deployment aborted to prevent data loss."
    }

    # Docker and Compose must be usable before any backup or deployment action.
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker CLI is not available on PATH."
    }
    docker version --format '{{.Server.Version}}' 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker daemon is unavailable or docker version failed." }
    docker compose version 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose is unavailable." }
    docker compose --project-directory $ProjectRoot --project-name librarymanagement config --quiet
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose configuration validation failed." }

    # Git checks are read-only; dry runs never pull or change Git state.
    if (-not $SkipPull -and -not $DryRun) {
        $gitStatus = Get-GitOutput -Arguments @('status', '--porcelain') -AllowEmptyOutput
        $problematicChanges = @($gitStatus -split "\r?\n" | Where-Object { $_.Trim() -and $_ -notmatch '\.last_(deployed|failed)_sha' -and $_ -notmatch 'backups[\\/]' })
        if ($problematicChanges.Count -gt 0) {
            throw "Working directory contains uncommitted changes that could conflict with deployment:`n$($problematicChanges -join "`n")"
        }
        $currentBranch = (Get-GitOutput -Arguments @('rev-parse', '--abbrev-ref', 'HEAD')).Trim()
        if ([string]::IsNullOrWhiteSpace($currentBranch)) { throw "Unable to determine the current Git branch." }
        if ($currentBranch -ne "main") {
            throw "Current git branch is '$currentBranch'. Automated deployment only deploys 'main'."
        }
    }

    if ($DryRun) {
        Write-Success "Dry run passed: required files, JWT_SECRET, Docker daemon, Compose, and Compose configuration are valid. No backup, Git change, or container change was performed."
        exit 0
    }

    # Create backup only after all pre-flight checks have passed.
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = Join-Path $ProjectRoot "backups"
    if (-not (Test-Path -LiteralPath $backupDir -PathType Container)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    $backupPath = Join-Path $backupDir "library_backup_$timestamp.db"
    Copy-Item -LiteralPath $DatabasePath -Destination $backupPath
    Write-Success "Created pre-deployment database backup at $backupPath"

    # Step 2: Code update (if requested)
    if (-not $SkipPull) {
        Write-Step "Step 2: Pulling Latest Verified Code on main"
        $prevCommit = (Get-GitOutput -Arguments @('rev-parse', 'HEAD')).Trim()
        & git -C $ProjectRoot pull origin main
        if ($LASTEXITCODE -ne 0) { throw "git pull origin main failed." }
        $newCommit = (Get-GitOutput -Arguments @('rev-parse', 'HEAD')).Trim()
        Write-Success "Git branch 'main' updated: $prevCommit -> $newCommit"
    } else {
        $newCommit = (Get-GitOutput -Arguments @('rev-parse', 'HEAD')).Trim()
        Write-Step "Step 2: Deploying Local Commit $newCommit (SkipPull specified)"
    }

    # Step 3: Preserve existing Compose images for rollback.
    Write-Step "Step 3: Preserving Previous Docker Images for Fallback"
    $previousBackendAvailable = $false
    $previousFrontendAvailable = $false
    docker image inspect librarymanagement-backend:latest 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        docker tag librarymanagement-backend:latest librarymanagement-backend:previous
        if ($LASTEXITCODE -ne 0) { throw "Failed to tag the current backend image for rollback." }
        $previousBackendAvailable = $true
    }
    docker image inspect librarymanagement-frontend:latest 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        docker tag librarymanagement-frontend:latest librarymanagement-frontend:previous
        if ($LASTEXITCODE -ne 0) { throw "Failed to tag the current frontend image for rollback." }
        $previousFrontendAvailable = $true
    }
    if ($previousBackendAvailable -or $previousFrontendAvailable) {
        Write-Success "Preserved available previous image tags."
        if (-not ($previousBackendAvailable -and $previousFrontendAvailable)) {
            Write-Host "Notice: A complete previous image pair is unavailable; automatic rollback cannot restore the full application." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Notice: No previous images exist; automatic image rollback is unavailable for this first deployment." -ForegroundColor Gray
    }

    # Step 4: Rebuild Images & Update Containers via Docker Compose
    Write-Step "Step 4: Updating Docker Containers via Docker Compose"
    
    if ($ForceRebuild) {
        Write-Host "Force rebuilding all services..." -ForegroundColor Yellow
        docker compose --project-directory $ProjectRoot --project-name librarymanagement build --no-cache
    } else {
        docker compose --project-directory $ProjectRoot --project-name librarymanagement build
    }
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose image build failed (exit $LASTEXITCODE)." }

    Write-Host "Launching updated containers..." -ForegroundColor Yellow
    $deploymentUpdateAttempted = $true
    docker compose --project-directory $ProjectRoot --project-name librarymanagement up -d
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose container update failed (exit $LASTEXITCODE)." }

    # Step 5: Post-deployment Health and Integrity Verification
    Write-Step "Step 5: Post-deployment Health and Integrity Verification"
    
    $maxRetries = 15
    $retryDelay = 2
    $healthy = $false

    Write-Host "Waiting for services to become responsive on http://localhost:5173/api/health..." -ForegroundColor Yellow
    for ($i = 1; $i -le $maxRetries; $i++) {
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:5173/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
            if ($null -ne $health -and $health.status -eq "ok") {
                $healthy = $true
                break
            }
        } catch {
            Start-Sleep -Seconds $retryDelay
        }
    }

    if (-not $healthy) {
        throw "API health check failed: http://localhost:5173/api/health did not return status 'ok' within $($maxRetries * $retryDelay)s."
    }
    Write-Success "API Health check passed: status=ok"

    # Verify Frontend root HTML loads
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -Method Get -TimeoutSec 3 -UseBasicParsing
        if ($frontendResponse.StatusCode -ne 200) {
            throw "Frontend returned status $($frontendResponse.StatusCode)"
        }
        Write-Success "Frontend web server responding (HTTP 200)"
    } catch {
        throw "Frontend verification failed: $($_.Exception.Message)"
    }

    Write-Success "Frontend and API health checks passed."

    Write-Step "DEPLOYMENT COMPLETE"
    Write-Success "Application successfully deployed and verified at http://localhost:5173"
    exit 0

} catch {
    $errorRecord = $_
    $invocation = $errorRecord.InvocationInfo
    if (-not $DryRun -and ($previousBackendAvailable -or $previousFrontendAvailable) -and $deploymentUpdateAttempted) {
        try {
            Invoke-ImageRollback -BackendAvailable $previousBackendAvailable -FrontendAvailable $previousFrontendAvailable
        } catch {
            Write-Failure "Automatic image rollback failed: $($_.Exception.Message)"
        }
    }
    Write-Failure "Deployment failed: $($errorRecord.Exception.Message)"
    Write-Host "Exception message: $($errorRecord.Exception.Message)" -ForegroundColor Red
    Write-Host "Script name: $($invocation.ScriptName)" -ForegroundColor Yellow
    Write-Host "Script line number: $($invocation.ScriptLineNumber)" -ForegroundColor Yellow
    Write-Host "Failing line: $($invocation.Line)" -ForegroundColor Yellow
    Write-Host "Script stack trace: $($errorRecord.ScriptStackTrace)" -ForegroundColor Yellow
    Write-Host "Database 'library.db' was not intentionally modified by the deployment script." -ForegroundColor Green
    Write-Host "Inspect container logs with: docker compose logs --tail=50" -ForegroundColor Yellow
    exit 1
}
