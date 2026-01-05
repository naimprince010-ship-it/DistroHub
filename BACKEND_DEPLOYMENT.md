# Backend Deployment Guide (Vercel নয়!)

## ⚠️ Important: Vercel Backend এর জন্য ভালো নয়

Vercel মূলত **frontend/static sites** এর জন্য। FastAPI backend এর জন্য **Railway, Render, বা Fly.io** use করুন।

---

## 🚀 Option 1: Railway (সবচেয়ে সহজ - Recommended)

### Step 1: Railway Account তৈরি করুন
1. https://railway.app এ যান
2. GitHub account দিয়ে sign up করুন

### Step 2: Project Deploy করুন
```bash
# Railway CLI install করুন
npm install -g @railway/cli

# Login করুন
railway login

# Project folder এ যান
cd distrohub-backend

# Project initialize করুন
railway init

# Deploy করুন
railway up
```

### Step 3: Environment Variables Set করুন
Railway Dashboard:
1. Your Project → Variables tab
2. Add variables:
   - `USE_SUPABASE` = `true`
   - `SUPABASE_URL` = `your_supabase_url`
   - `SUPABASE_KEY` = `your_supabase_key`

### Step 4: Domain পাওয়া
Railway automatically একটি URL দেবে:
```
https://your-app.railway.app
```

**এই URL টি frontend এর `VITE_API_URL` এ use করুন!**

---

## 🚀 Option 2: Render (Free Tier Available)

### Step 1: Render Account তৈরি করুন
1. https://render.com এ যান
2. GitHub account দিয়ে sign up করুন

### Step 2: New Web Service তৈরি করুন
1. Dashboard → **New** → **Web Service**
2. GitHub repository connect করুন
3. Settings:
   - **Name**: `distrohub-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `distrohub-backend`

### Step 3: Environment Variables
1. Settings → **Environment**
2. Add:
   - `USE_SUPABASE` = `true`
   - `SUPABASE_URL` = `your_url`
   - `SUPABASE_KEY` = `your_key`

### Step 4: Deploy
- **Create Web Service** click করুন
- Render automatically deploy করবে

**URL**: `https://your-app.onrender.com`

---

## 🚀 Option 3: Fly.io (Fast & Global)

### Step 1: Install Fly CLI
```bash
# Windows: PowerShell
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Login & Deploy
```bash
cd distrohub-backend

# Login
fly auth login

# Initialize
fly launch

# Set secrets
fly secrets set USE_SUPABASE=true
fly secrets set SUPABASE_URL=your_url
fly secrets set SUPABASE_KEY=your_key

# Deploy
fly deploy
```

**URL**: `https://your-app.fly.dev`

---

## 🚀 Option 4: PythonAnywhere (Simple)

1. https://www.pythonanywhere.com এ account তৈরি করুন
2. Files tab → Upload `distrohub-backend` folder
3. Web tab → Add new web app
4. Manual configuration → Python 3.10
5. WSGI file edit করুন
6. Reload web app

---

## 📝 Environment Variables (সব Platform এর জন্য)

```env
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

---

## ✅ Deployment Checklist

- [ ] Backend platform select করুন (Railway/Render/Fly.io)
- [ ] Account তৈরি করুন
- [ ] Repository connect করুন
- [ ] Environment variables set করুন
- [ ] Deploy করুন
- [ ] Backend URL note করুন
- [ ] Frontend `.env` file এ `VITE_API_URL` update করুন

---

## 🔗 Frontend Configuration

Backend deploy হওয়ার পর:

**File**: `distrohub-frontend/.env`
```env
VITE_API_URL=https://your-backend.railway.app
# বা
VITE_API_URL=https://your-backend.onrender.com
# বা
VITE_API_URL=https://your-backend.fly.dev
```

---

## 🎯 Recommended: Railway

**কেন Railway?**
- ✅ সহজ setup
- ✅ Automatic HTTPS
- ✅ Free tier available
- ✅ Fast deployment
- ✅ Good documentation

---

## 📞 Quick Start (Railway)

```bash
# 1. Install CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
cd distrohub-backend
railway init
railway up

# 4. Get URL
railway domain
```

**Done!** 🎉

---

**Status**: ✅ Backend deployment files তৈরি করা হয়েছে

