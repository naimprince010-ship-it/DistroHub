# Railway Deployment Script for Windows PowerShell
# Run this after: railway login

Write-Host "🚀 Starting Railway Deployment..." -ForegroundColor Green

# Check if logged in
$loggedIn = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Railway. Please run: railway login" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged in to Railway" -ForegroundColor Green

# Initialize project if not already
if (-not (Test-Path ".railway\project.json")) {
    Write-Host "📦 Initializing Railway project..." -ForegroundColor Yellow
    railway init
}

# Set environment variables
Write-Host "🔧 Setting environment variables..." -ForegroundColor Yellow
railway variables set USE_SUPABASE=true

# Note: Uncomment and update these with your actual Supabase credentials
# railway variables set SUPABASE_URL=your_supabase_url
# railway variables set SUPABASE_KEY=your_supabase_key

# Deploy
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Yellow
railway up

# Get URL
Write-Host "🌐 Getting deployment URL..." -ForegroundColor Yellow
railway domain

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "📝 Update your frontend VITE_API_URL with the Railway URL above" -ForegroundColor Cyan

