# Railway Setup Steps (Step by Step)

## Step 1: Create New Project

1. Railway Dashboard এ **"New Project"** button এ click করুন
2. **"Deploy from GitHub repo"** select করুন
3. GitHub authorization করুন (যদি প্রথমবার হয়)
4. Repository select করুন: **`naimprince010-ship-it/DistroHub`**

## Step 2: Configure Project

1. **Root Directory** set করুন: `distrohub-backend`
2. Railway automatically detect করবে:
   - Python environment
   - `requirements.txt`
   - Build command
   - Start command (from `railway.json`)

## Step 3: Environment Variables

Project create হওয়ার পর:

1. Project → **Variables** tab এ যান
2. **Add Variable** click করুন
3. এই variables add করুন:
   ```
   USE_SUPABASE = true
   SUPABASE_URL = আপনার Supabase URL
   SUPABASE_KEY = আপনার Supabase Key
   ```

## Step 4: Deploy

Railway automatically deploy করবে। Deployment complete হলে:

1. Project → **Settings** → **Domains**
2. URL copy করুন (যেমন: `https://distrohub-backend-production.up.railway.app`)

## Step 5: Update Frontend

Vercel Dashboard এ:
1. Your Project → **Settings** → **Environment Variables**
2. `VITE_API_URL` update করুন = Railway থেকে পাওয়া URL
3. **Redeploy** করুন

---

**Important**: Existing projects select করবেন না। **New Project** তৈরি করুন DistroHub backend এর জন্য।

