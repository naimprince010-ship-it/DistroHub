# Quick Vercel Redeploy - Supplier API Fix

## Problem
Production shows **ZERO API calls** → Old build is cached.

---

## Solution: Force Clean Redeploy

### Step 1: Commit Console Log Marker
```powershell
cd C:\Users\User\DistroHub
git add distrohub-frontend/src/pages/Settings.tsx
git commit -m "Add API MODE ACTIVE console log marker"
git push origin main
```

### Step 2: Vercel Dashboard Redeploy

1. **Vercel Dashboard** → `distrohub-frontend` project
2. **Deployments** → Latest deployment
3. Click **"..."** → **"Redeploy"**
4. **⚠️ CRITICAL**: Uncheck **"Use existing Build Cache"**
5. Click **"Redeploy"**

**Why uncheck cache**: Forces fresh build from latest code.

### Step 3: Wait for Deployment
- Usually takes **1-3 minutes**
- Status should show **"Ready"** (green)

### Step 4: Verify in Browser

1. **Hard refresh**: `Ctrl + Shift + R`
2. **Open**: Settings → Suppliers
3. **DevTools** → **Console** tab
4. **Look for:**
```
[SupplierManagement] ============================================
[SupplierManagement] API MODE ACTIVE - Version: 2026-01-03
[SupplierManagement] ============================================
```

**If you see this**: ✅ Correct build loaded  
**If you DON'T**: ❌ Still cached → Clear browser cache and retry

### Step 5: Verify Network Request

1. **DevTools** → **Network** tab
2. **Enable**: "Preserve log"
3. **Clear** network log
4. **Reload** page (Settings → Suppliers)

**✅ REQUIRED REQUEST:**
```
GET /api/suppliers
Status: 200
Headers: Authorization: Bearer <token>
Response: [array of suppliers]
```

**If this appears**: ✅ Fix confirmed  
**If missing**: ❌ Still old build → Check deployment status

---

## Why Old Build Served

1. **Cached Build** - Vercel reused old build cache
2. **Wrong Branch** - Production linked to wrong Git branch
3. **Failed Deployment** - Latest deploy failed, old one still active
4. **Browser Cache** - Browser cached old JavaScript bundle

---

## If Still Not Working

### Check Deployment Status
- Vercel Dashboard → Deployments
- Latest should be **"Ready"** (green)
- If **"Error"**: Check build logs

### Clear Build Cache
- Vercel Dashboard → Settings → General
- Scroll down → **"Clear Build Cache"** → Click
- Redeploy

### Check Branch
- Settings → Git → Production Branch
- Should be `main` (or `master`)

### Check Root Directory
- Settings → General → Root Directory
- Should be `distrohub-frontend`

---

## The ONE Network Request That Must Appear

**When fix is live, you MUST see:**

```
Method: GET
URL: https://your-backend.onrender.com/api/suppliers
Status: 200
Request Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Response: [array of supplier objects]
```

**This is the proof the fix is working.**

---

## Quick Checklist

- [ ] Code committed and pushed
- [ ] Vercel redeployed (cache unchecked)
- [ ] Deployment status: **Ready**
- [ ] Console shows: `API MODE ACTIVE`
- [ ] Network shows: `GET /api/suppliers` with `Authorization` header
- [ ] Response status: `200`

**All checked?** → ✅ Fix confirmed

