param(
    [string]$BackupDir = $env:BACKUP_DIR,
    [int]$RetentionDays = $(if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 30 })
)

if (-not $env:SUPABASE_DB_URL) {
    Write-Error "SUPABASE_DB_URL is not set. Please set it before running."
    exit 1
}

if (-not $BackupDir -or $BackupDir.Trim() -eq "") {
    $BackupDir = "C:\DistroHubBackups"
}

if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $BackupDir "distrohub-backup-$timestamp.sql"

Write-Host "Starting backup to $backupFile"

& pg_dump "$env:SUPABASE_DB_URL" --no-owner --no-privileges --format=plain --file "$backupFile"
if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Backup completed."

if ($RetentionDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupDir -Filter "distrohub-backup-*.sql" |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        ForEach-Object {
            Write-Host "Removing old backup: $($_.FullName)"
            Remove-Item -Force $_.FullName
        }
}
