# Render Deployment - Quick Setup Guide

## 🚀 Step-by-Step (5 Minutes)

### Step 1: Render Account
1. Go to: https://render.com
2. Click **"Get Started for Free"**
3. **Sign up with GitHub** (recommended)
4. Authorize Render to access your repositories

### Step 2: Create Web Service
1. Dashboard → **"New +"** button (top right)
2. Select **"Web Service"**
3. **"Connect account"** → Select GitHub
4. Repository select করুন: **`naimprince010-ship-it/DistroHub`**
5. Click **"Connect"**

### Step 3: Configure Service
Fill in these details:

**Basic Settings:**
- **Name**: `distrohub-backend`
- **Region**: `Singapore` (or closest to you)
- **Branch**: `main`
- **Root Directory**: `distrohub-backend` ⚠️ Important!

**Build & Deploy:**
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Plan:**
- Select **"Free"** plan

### Step 4: Environment Variables
Scroll down to **"Environment Variables"** section:

Click **"Add Environment Variable"** and add:

1. **Key**: `USE_SUPABASE`
   **Value**: `true`

2. **Key**: `SUPABASE_URL`
   **Value**: `https://llucnnzcslnulnyzourx.supabase.co` (আপনার URL)

3. **Key**: `SUPABASE_KEY`
   **Value**: `your-anon-key` (আপনার anon key)

### Step 5: Deploy
1. Scroll down → Click **"Create Web Service"**
2. Render automatically:
   - Clones your repo
   - Installs dependencies (5-10 minutes)
   - Builds the app
   - Deploys it

### Step 6: Get Backend URL
Deployment complete হওয়ার পর:

1. Your service page → **Settings** tab
2. Scroll to **"Service Details"**
3. **"Render URL"** দেখবেন:
   ```
   https://distrohub-backend.onrender.com
   ```
   এই URL copy করুন

### Step 7: Update Vercel Frontend
1. **Vercel Dashboard** → Your Frontend Project
2. **Settings** → **Environment Variables**
3. `VITE_API_URL` variable update করুন:
   - Value: `https://distrohub-backend.onrender.com` (Render URL)
4. **Save**
5. **Deployments** → **Redeploy** করুন

---

## ✅ Verification

### Test Backend:
Browser এ open করুন:
```
https://distrohub-backend.onrender.com/healthz
```
Should return: `{"status":"ok"}`

### Test Frontend:
1. Frontend URL এ যান
2. Login করুন
3. Settings → Categories
4. Category add করুন
5. Refresh page
6. Category persist হওয়া check করুন ✅

---

## 📋 Checklist

- [ ] Render account created
- [ ] Web Service created
- [ ] Root Directory: `distrohub-backend` set
- [ ] Environment variables added
- [ ] Deployment successful
- [ ] Backend URL copied
- [ ] Vercel `VITE_API_URL` updated
- [ ] Frontend redeployed
- [ ] Tested successfully

---

## ⚠️ Important Notes

1. **Root Directory**: Must be `distrohub-backend` (not root)
2. **First Deploy**: Takes 5-10 minutes
3. **Free Tier**: Service sleeps after 15 min inactivity (first request slow)
4. **Environment Variables**: Must add before first deploy

---

**Status**: ✅ Ready to deploy on Render!

