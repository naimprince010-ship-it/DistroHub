# Railway Auto-Deployment via GitHub Integration

Since Railway CLI requires browser login, using GitHub integration is the best approach.

## Automated Setup Instructions

### Step 1: Railway Web Dashboard Setup

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select repository: `naimprince010-ship-it/DistroHub`
6. Configure:
   - **Root Directory**: `distrohub-backend`
   - **Build Command**: (auto-detected) `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 2: Environment Variables (Railway Dashboard)

Go to your project → Variables tab → Add:

```
USE_SUPABASE=true
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Step 3: Deploy

Railway will automatically deploy. Get the URL from:
- Project → Settings → Domains
- Or: Project → Deployments → View URL

---

## Alternative: Use Railway API (If Available)

If you have Railway API token, we can automate this.

