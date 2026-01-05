# Fix Login - Vercel Environment Variable Setup

## ✅ Backend Status:
- ✅ Backend is working: `https://distrohub-backend.onrender.com`
- ✅ Health check: `{"status":"ok"}`

## 🔍 Problem:
Frontend can't connect to backend because `VITE_API_URL` is not set in Vercel.

---

## 🎯 Solution: Set Environment Variable in Vercel

### Step 1: Open Vercel Dashboard
1. Go to: **https://vercel.com/dashboard**
2. Click on **`distrohub-frontend`** project

### Step 2: Go to Environment Variables
1. Click **Settings** (left sidebar)
2. Click **Environment Variables** (under "Configuration")

### Step 3: Add VITE_API_URL
1. Click **Add New** button
2. Fill in:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://distrohub-backend.onrender.com`
   - **Environment**: Select **ALL**:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
3. Click **Save**

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (2-3 minutes)

---

## 🧪 Test Login:
After redeploy, test with:
- **Email**: `admin@distrohub.com`
- **Password**: `admin123`

---

## 📋 Quick Checklist:
- [ ] Vercel Dashboard → Settings → Environment Variables
- [ ] Add `VITE_API_URL` = `https://distrohub-backend.onrender.com`
- [ ] Select all environments
- [ ] Save
- [ ] Redeploy
- [ ] Test login

---

**After setting the environment variable and redeploying, login should work!**

