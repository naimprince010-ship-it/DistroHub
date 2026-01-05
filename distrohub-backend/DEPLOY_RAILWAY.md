# Railway Deployment - Interactive Steps Required

Since Railway CLI requires browser-based login, here's the step-by-step process:

## Step 1: Login to Railway (Browser Required)

1. Open terminal in `distrohub-backend` directory
2. Run: `railway login`
3. Browser will open - complete login
4. Return to terminal

## Step 2: Initialize Project

```bash
cd distrohub-backend
railway init
# Select: New Project
# Name: distrohub-backend
```

## Step 3: Set Environment Variables

```bash
railway variables set USE_SUPABASE=true
railway variables set SUPABASE_URL=your_supabase_url
railway variables set SUPABASE_KEY=your_supabase_key
```

## Step 4: Deploy

```bash
railway up
```

## Step 5: Get URL

```bash
railway domain
# Or check Railway dashboard
```

---

## Alternative: Use Railway Web Dashboard

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select your repository
4. Root Directory: `distrohub-backend`
5. Set environment variables in dashboard
6. Deploy automatically

