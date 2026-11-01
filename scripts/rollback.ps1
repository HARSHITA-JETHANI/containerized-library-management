<#
.SYNOPSIS
  Rollback Script for Containerized Library Management System.
.DESCRIPTION
  Provides two modes of rollback:
  1. Default (App-Only): Restores the previous Docker container images (:previous)
     without touching the current SQLite database (preserving new books/loans).
  2. Database Rollback (-RestoreDatabase): Explicitly restores the database file
     from a pre-deployment backup snapshot when data corruption is suspected.
.PARAMETER RestoreDatabase
  Switch to restore the SQLite database file from a backup snapshot.
.PARAMETER BackupFile
  Path to a specific .db backup file (only used if -RestoreDatabase is specified).
#>

[CmdletBinding()]
param (
    [switch]$RestoreDatabase,
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DatabasePath = Join-Path $ProjectRoot "library.db"
$ComposeArgs = @('--project-directory', $ProjectRoot, '--project-name', 'librarymanagement')

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
    if ($RestoreDatabase) {
        Write-Step "Mode: Database Snapshot Restoration Requested"
        
        $targetBackup = $null
        if ($BackupFile) {
            $resolvedBackup = if ([System.IO.Path]::IsPathRooted($BackupFile)) { $BackupFile } else { Join-Path $ProjectRoot $BackupFile }
            if (-not (Test-Path -LiteralPath $resolvedBackup -PathType Leaf)) {
                throw "Specified backup file does not exist: $BackupFile"
            }
            $targetBackup = (Get-Item -LiteralPath $resolvedBackup).FullName
        } else {
            $backupDir = Join-Path $ProjectRoot "backups"
            if (-not (Test-Path -LiteralPath $backupDir -PathType Container)) {
                throw "No backups directory found at $backupDir"
            }
            $latest = Get-ChildItem -Path $backupDir -Filter "library_backup_*.db" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if (-not $latest) {
                throw "No database backups found in $backupDir"
            }
            $targetBackup = $latest.FullName
        }

        Write-Host "Selected backup snapshot: $targetBackup" -ForegroundColor Yellow
        Write-Host "Gracefully stopping backend container..." -ForegroundColor Yellow
        docker compose @ComposeArgs stop backend
        if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed to stop the backend before database restoration." }

        Copy-Item -LiteralPath $targetBackup -Destination $DatabasePath -Force
        Write-Success "Restored library.db from $targetBackup"

        Write-Host "Restarting containers..." -ForegroundColor Yellow
        docker compose @ComposeArgs up -d
        if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed to restart after database restoration." }
    } else {
        Write-Step "Mode: Application-Only Image Rollback (Preserving Database)"
        
        # Check if :previous images exist
        $prevBackend = docker image inspect librarymanagement-backend:previous --format '{{.Id}}' 2>$null
        $backendInspectExit = $LASTEXITCODE
        $prevFrontend = docker image inspect librarymanagement-frontend:previous --format '{{.Id}}' 2>$null
        $frontendInspectExit = $LASTEXITCODE

        if ($backendInspectExit -ne 0 -or $frontendInspectExit -ne 0 -or -not $prevBackend -or -not $prevFrontend) {
            throw "Previous image tags (:previous) were not found. Cannot perform instant image rollback. To restore database snapshot instead, run with -RestoreDatabase."
        }

        Write-Host "Retagging :previous images to :latest..." -ForegroundColor Yellow
        docker tag librarymanagement-backend:previous librarymanagement-backend:latest
        if ($LASTEXITCODE -ne 0) { throw "Failed to retag the previous backend image." }
        docker tag librarymanagement-frontend:previous librarymanagement-frontend:latest
        if ($LASTEXITCODE -ne 0) { throw "Failed to retag the previous frontend image." }

        Write-Host "Re-deploying containers using previous images..." -ForegroundColor Yellow
        docker compose @ComposeArgs up -d
        if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed to restart the previous images." }

        Write-Success "Re-deployed previous application version. Database data was preserved completely intact."
    }

    # Verify post-rollback health
    Write-Step "Verifying Post-Rollback Health & Persistence"
    $maxRetries = 10
    $healthy = $false
    for ($i = 1; $i -le $maxRetries; $i++) {
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:5173/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
            if ($null -ne $health -and $health.status -eq "ok") {
                $healthy = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    }

    if (-not $healthy) {
        throw "Health check failed after rollback."
    }
    Write-Success "API Health check passed: status=ok"

    Write-Success "Rollback health check passed. The image-only rollback path does not copy to or restore library.db."

    Write-Step "ROLLBACK COMPLETE"
    Write-Success "Application restored and operational at http://localhost:5173"
    exit 0

} catch {
    Write-Failure "Rollback error: $($_.Exception.Message)"
    exit 1
}
