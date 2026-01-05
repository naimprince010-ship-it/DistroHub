#!/bin/bash
# Railway Deployment Script
# Run this after: railway login

echo "🚀 Starting Railway Deployment..."

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "✅ Logged in to Railway"

# Initialize project if not already
if [ ! -f ".railway/project.json" ]; then
    echo "📦 Initializing Railway project..."
    railway init
fi

# Set environment variables (update these with your values)
echo "🔧 Setting environment variables..."
railway variables set USE_SUPABASE=true
# Note: Update SUPABASE_URL and SUPABASE_KEY with your actual values
# railway variables set SUPABASE_URL=your_supabase_url
# railway variables set SUPABASE_KEY=your_supabase_key

# Deploy
echo "🚀 Deploying to Railway..."
railway up

# Get URL
echo "🌐 Getting deployment URL..."
railway domain

echo "✅ Deployment complete!"
echo "📝 Update your frontend VITE_API_URL with the Railway URL above"

