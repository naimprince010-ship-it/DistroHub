# Render Deployment Guide (Free Tier)

## 🚀 Step-by-Step Render Deployment

### Step 1: Create Account
1. Go to https://render.com
2. **Sign up** with GitHub
3. Authorize Render to access your repositories

### Step 2: Create Web Service
1. Dashboard → **New** → **Web Service**
2. **Connect GitHub** → Select `naimprince010-ship-it/DistroHub`
3. Configure:
   - **Name**: `distrohub-backend`
   - **Region**: Choose closest (e.g., Singapore)
   - **Branch**: `main`
   - **Root Directory**: `distrohub-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: **Free** (select free tier)

### Step 3: Environment Variables
Scroll down to **Environment Variables** section:
- Click **Add Environment Variable**
- Add these 3:
  ```
  USE_SUPABASE = true
  SUPABASE_URL = your_supabase_url
  SUPABASE_KEY = your_supabase_key
  ```

### Step 4: Deploy
1. Click **Create Web Service**
2. Render automatically:
   - Clones your repo
   - Installs dependencies
   - Builds the app
   - Deploys it

### Step 5: Get URL
After deployment (5-10 minutes):
1. Your service page → **Settings**
2. Scroll to **Custom Domain** section
3. **Render URL** দেখবেন:
   ```
   https://distrohub-backend.onrender.com
   ```
   এই URL copy করুন

### Step 6: Update Frontend
1. **Vercel Dashboard** → Frontend Project
2. **Settings** → **Environment Variables**
3. Update `VITE_API_URL` = `https://distrohub-backend.onrender.com`
4. **Redeploy** frontend

---

## ✅ Advantages of Render

- ✅ **Free tier** available
- ✅ **Web services** supported (unlike Railway free)
- ✅ **Automatic HTTPS**
- ✅ **GitHub integration**
- ✅ **Auto-deploy** on git push

---

## ⚠️ Render Free Tier Limitations

- Service sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds (cold start)
- For production, consider paid plan ($7/month)

---

**Next**: Render এ deploy করুন → URL পাওয়ার পর Vercel এ update করুন

