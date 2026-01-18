# Supabase Daily Backup (Windows)

This guide sets up a daily backup of your Supabase database to a fixed folder.

## 1) Install Postgres tools (pg_dump)
- Install PostgreSQL (client tools are enough).
- Ensure `pg_dump` is in your PATH.

## 2) Set environment variables
Open PowerShell and set:

```powershell
setx SUPABASE_DB_URL "postgresql://USER:PASSWORD@HOST:5432/postgres"
setx BACKUP_DIR "C:\DistroHubBackups"
setx BACKUP_RETENTION_DAYS "30"
```

Notes:
- Use your Supabase **connection string** for `SUPABASE_DB_URL`.
- `BACKUP_DIR` is the target folder for daily backups.
- `BACKUP_RETENTION_DAYS` keeps the last N days and deletes older files.

## 3) Run manual test
```powershell
powershell -ExecutionPolicy Bypass -File "c:\Users\User\DistroHub\distrohub-backend\scripts\backup_supabase.ps1"
```

You should see a new file like:
```
C:\DistroHubBackups\distrohub-backup-YYYYMMDD-HHMMSS.sql
```

## 4) Schedule daily backup (Task Scheduler)
1. Open **Task Scheduler** → **Create Task**
2. **General**:
   - Name: `DistroHub Supabase Backup`
   - Run whether user is logged on or not
3. **Triggers**:
   - New → Daily → set time (e.g., 2:00 AM)
4. **Actions**:
   - New → Start a program
   - Program: `powershell`
   - Arguments:
     ```
     -ExecutionPolicy Bypass -File "c:\Users\User\DistroHub\distrohub-backend\scripts\backup_supabase.ps1"
     ```
5. Save task and run once to verify.

## Restore (if needed)
```powershell
psql "$env:SUPABASE_DB_URL" -f "C:\DistroHubBackups\distrohub-backup-YYYYMMDD-HHMMSS.sql"
```
