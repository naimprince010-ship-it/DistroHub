# PowerShell Script to Copy SQL Files to Clipboard
# Usage: .\copy-sql.ps1 schema.sql

param(
    [Parameter(Mandatory=$true)]
    [string]$FileName
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$filePath = Join-Path $scriptPath $FileName

if (Test-Path $filePath) {
    $content = Get-Content $filePath -Raw
    Set-Clipboard -Value $content
    Write-Host "✅ Successfully copied $FileName to clipboard!" -ForegroundColor Green
    Write-Host "📋 Now paste it in Supabase SQL Editor" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔗 Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/llucnnzcslnulnyzourx/sql" -ForegroundColor Blue
} else {
    Write-Host "❌ File not found: $filePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available SQL files:" -ForegroundColor Yellow
    Get-ChildItem -Path $scriptPath -Filter "*.sql" -Recurse | Select-Object FullName
}



