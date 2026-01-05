# Vercel Redeploy - Fix Login

## ✅ Current Status:
- ✅ `VITE_API_URL` is set in Vercel
- ⚠️ Value has trailing slash: `https://distrohub-backend.onrender.com/`
- ⚠️ Needs redeploy after setting environment variable

---

## 🎯 Fix Steps:

### Option 1: Remove Trailing Slash (Recommended)
1. **Vercel Dashboard** → Settings → Environment Variables
2. Click on `VITE_API_URL`
3. **Edit** the value:
   - **Change from**: `https://distrohub-backend.onrender.com/`
   - **Change to**: `https://distrohub-backend.onrender.com` (remove `/`)
4. **Save**
5. **Redeploy** (see below)

### Option 2: Keep Trailing Slash (if Option 1 doesn't work)
- Keep the value as is: `https://distrohub-backend.onrender.com/`
- Just redeploy

---

## 🔄 Redeploy Steps:

1. **Vercel Dashboard** → **Deployments** tab
2. Click on **latest deployment**
3. Click **⋯** (three dots) → **Redeploy**
4. Wait 2-3 minutes for deployment to complete
5. Test login again

---

## 🧪 Test Login:

After redeploy:
1. Go to: `https://distrohub-frontend.vercel.app/login`
2. Use credentials:
   - **Email**: `admin@distrohub.com`
   - **Password**: `admin123`

---

## 📋 Important Notes:

### ✅ Supabase Variables:
- **NOT needed in Vercel** (frontend)
- **Only needed in Render** (backend)
- Frontend doesn't connect to Supabase directly
- Frontend → Backend API → Supabase

### ✅ Environment Variables Summary:

**Vercel (Frontend):**
- ✅ `VITE_API_URL` = `https://distrohub-backend.onrender.com`

**Render (Backend):**
- ✅ `USE_SUPABASE` = `true`
- ✅ `SUPABASE_URL` = (your Supabase URL)
- ✅ `SUPABASE_KEY` = (your Supabase Key)

---

**Next Step**: Redeploy in Vercel and test login!

