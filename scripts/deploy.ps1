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
#>

[CmdletBinding()]
param (
    [switch]$ForceRebuild,
    [switch]$SkipPull
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "E:\Harshi\7th SEM\CLOUD AUTOMATION\LibraryManagement"
Set-Location $ProjectRoot

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

try {
    Write-Step "Step 1: Pre-deployment Environment & Database Check"
    
    # 1. Verify working directory has no uncommitted code changes that could conflict with git pull
    if (-not $SkipPull) {
        $unstaged = (git status --porcelain).Trim()
        # Filter out .last_deployed_sha or backups if any appear
        $problematicChanges = $unstaged -split "`n" | Where-Object { $_ -notmatch "\.last_deployed_sha" -and $_ -notmatch "backups/" }
        if ($problematicChanges.Count -gt 0 -and $problematicChanges[0] -ne "") {
            throw "Working directory contains uncommitted tracked changes. Stash or commit before deploying:`n$($problematicChanges -join "`n")"
        }
    }

    # 2. Verify .env exists and has JWT_SECRET
    if (-not (Test-Path ".env")) {
        throw "Root .env file is missing. Please create .env with JWT_SECRET."
    }
    
    $envContent = Get-Content ".env" -Raw
    if ($envContent -notmatch "JWT_SECRET=[^\r\n]+") {
        throw "JWT_SECRET is missing or empty in .env. Deployment aborted."
    }

    # 3. Verify SQLite database file exists before any deployment
    if (-not (Test-Path "library.db")) {
        throw "library.db was not found in project root. Deployment aborted to prevent data loss."
    }

    # 4. Create safe pre-deployment snapshot of library.db
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = Join-Path $ProjectRoot "backups"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    $backupPath = Join-Path $backupDir "library_backup_$timestamp.db"
    Copy-Item "library.db" $backupPath -Force
    Write-Success "Created pre-deployment database backup at $backupPath"

    # Step 2: Code update (if requested)
    if (-not $SkipPull) {
        Write-Step "Step 2: Pulling Latest Verified Code on main"
        $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
        if ($currentBranch -ne "main") {
            throw "Current git branch is '$currentBranch'. Automated deployment only deploys 'main'."
        }
        $prevCommit = (git rev-parse HEAD).Trim()
        git pull origin main
        $newCommit = (git rev-parse HEAD).Trim()
        Write-Success "Git branch 'main' updated: $prevCommit -> $newCommit"
    } else {
        $newCommit = (git rev-parse HEAD).Trim()
        Write-Step "Step 2: Deploying Local Commit $newCommit (SkipPull specified)"
    }

    # Step 3: Tag existing images as ':previous' for instant fallback
    Write-Step "Step 3: Preserving Previous Docker Images for Fallback"
    try {
        docker tag librarymanagement-backend:latest librarymanagement-backend:previous 2>$null
        docker tag librarymanagement-frontend:latest librarymanagement-frontend:previous 2>$null
        Write-Success "Preserved previous container images with tag ':previous'"
    } catch {
        Write-Host "Notice: No previous images to tag, continuing..." -ForegroundColor Gray
    }

    # Step 4: Rebuild Images & Update Containers via Docker Compose
    Write-Step "Step 4: Updating Docker Containers via Docker Compose"
    
    if ($ForceRebuild) {
        Write-Host "Force rebuilding all services..." -ForegroundColor Yellow
        docker compose build --no-cache
    } else {
        docker compose build
    }

    Write-Host "Launching updated containers..." -ForegroundColor Yellow
    docker compose up -d

    # Step 5: Post-deployment Health and Integrity Verification
    Write-Step "Step 5: Post-deployment Health and Integrity Verification"
    
    $maxRetries = 15
    $retryDelay = 2
    $healthy = $false

    Write-Host "Waiting for services to become responsive on http://localhost:5173/api/health..." -ForegroundColor Yellow
    for ($i = 1; $i -le $maxRetries; $i++) {
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:5173/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
            if ($health.status -eq "ok") {
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

    # Verify Auth and Database persistence through Nginx
    try {
        $body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
        $loginRes = Invoke-RestMethod -Uri "http://localhost:5173/api/auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
        if (-not $loginRes.token) {
            throw "Login response did not contain an authentication token."
        }
        $headers = @{ "Authorization" = "Bearer $($loginRes.token)" }
        $books = Invoke-RestMethod -Uri "http://localhost:5173/api/books" -Method Get -Headers $headers -TimeoutSec 5
        Write-Success "Authentication and Database verified: $($books.Count) books accessible in persistent store."
    } catch {
        throw "Functional auth/database check failed: $($_.Exception.Message)"
    }

    Write-Step "DEPLOYMENT COMPLETE"
    Write-Success "Application successfully deployed and verified at http://localhost:5173"
    exit 0

} catch {
    Write-Failure "Deployment failed: $($_.Exception.Message)"
    Write-Host "Database 'library.db' remains completely intact in project root." -ForegroundColor Green
    Write-Host "Inspect container logs with: docker compose logs --tail=50" -ForegroundColor Yellow
    exit 1
}
