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
    if ($RestoreDatabase) {
        Write-Step "Mode: Database Snapshot Restoration Requested"
        
        $targetBackup = $null
        if ($BackupFile) {
            if (-not (Test-Path $BackupFile)) {
                throw "Specified backup file does not exist: $BackupFile"
            }
            $targetBackup = (Get-Item $BackupFile).FullName
        } else {
            $backupDir = Join-Path $ProjectRoot "backups"
            if (-not (Test-Path $backupDir)) {
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
        docker compose stop backend

        Copy-Item $targetBackup "library.db" -Force
        Write-Success "Restored library.db from $targetBackup"

        Write-Host "Restarting containers..." -ForegroundColor Yellow
        docker compose up -d
    } else {
        Write-Step "Mode: Application-Only Image Rollback (Preserving Database)"
        
        # Check if :previous images exist
        $prevBackend = docker images librarymanagement-backend:previous -q
        $prevFrontend = docker images librarymanagement-frontend:previous -q

        if (-not $prevBackend -or -not $prevFrontend) {
            throw "Previous image tags (:previous) were not found. Cannot perform instant image rollback. To restore database snapshot instead, run with -RestoreDatabase."
        }

        Write-Host "Retagging :previous images to :latest..." -ForegroundColor Yellow
        docker tag librarymanagement-backend:previous librarymanagement-backend:latest
        docker tag librarymanagement-frontend:previous librarymanagement-frontend:latest

        Write-Host "Re-deploying containers using previous images..." -ForegroundColor Yellow
        docker compose up -d

        Write-Success "Re-deployed previous application version. Database data was preserved completely intact."
    }

    # Verify post-rollback health
    Write-Step "Verifying Post-Rollback Health & Persistence"
    $maxRetries = 10
    $healthy = $false
    for ($i = 1; $i -le $maxRetries; $i++) {
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:5173/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
            if ($health.status -eq "ok") {
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

    $body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "http://localhost:5173/api/auth/login" -Method Post -Body $body -ContentType "application/json"
    $headers = @{ "Authorization" = "Bearer $($loginRes.token)" }
    $books = Invoke-RestMethod -Uri "http://localhost:5173/api/books" -Method Get -Headers $headers
    Write-Success "Rollback verified: $($books.Count) books accessible in library database."

    Write-Step "ROLLBACK COMPLETE"
    Write-Success "Application restored and operational at http://localhost:5173"
    exit 0

} catch {
    Write-Failure "Rollback error: $($_.Exception.Message)"
    exit 1
}
