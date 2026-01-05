# 🚀 Quick Deployment Guide

## Backend: Railway (সবচেয়ে সহজ)

### 1. Railway Setup
```bash
npm install -g @railway/cli
railway login
cd distrohub-backend
railway init
railway up
```

### 2. Environment Variables (Railway Dashboard)
- `USE_SUPABASE` = `true`
- `SUPABASE_URL` = আপনার Supabase URL
- `SUPABASE_KEY` = আপনার Supabase Key

### 3. Backend URL পাওয়া
Railway dashboard → Your Project → Settings → Domains
```
https://your-app.railway.app
```

---

## Frontend: Vercel

### 1. Vercel Deploy
```bash
cd distrohub-frontend
vercel login
vercel --prod
```

### 2. Environment Variable (Vercel Dashboard)
- Settings → Environment Variables
- `VITE_API_URL` = `https://your-app.railway.app` (Railway থেকে পাওয়া URL)

---

## ✅ Complete Flow

1. **Backend**: Railway এ deploy → URL পাওয়া
2. **Frontend**: Vercel এ deploy
3. **Frontend Environment**: Railway URL set করুন
4. **Done!** 🎉

---

**Railway URL**: Backend এর জন্য  
**Vercel URL**: Frontend এর জন্য

