# Vercel Dashboard Setup - Fix Deployment Error

## ✅ Changes Made:
- Removed `rootDirectory` from `vercel.json` (pushed to GitHub)
- Now configure in Vercel Dashboard

---

## 🎯 Vercel Dashboard Configuration:

### Step 1: Open Project Settings
1. **Vercel Dashboard** → `distrohub-frontend` project
2. **Settings** tab (left sidebar)

### Step 2: Set Root Directory
1. **General** tab
2. Scroll to **Root Directory**
3. **Set to**: `distrohub-frontend`
4. **Save**

### Step 3: Verify Build Settings
1. **Build & Development Settings** tab
2. Verify:
   - **Framework Preset**: `Vite` ✅
   - **Build Command**: `npm run build` ✅
   - **Output Directory**: `dist` ✅
   - **Install Command**: `npm install` ✅

### Step 4: Redeploy
1. **Deployments** tab
2. Latest deployment → **⋯** (three dots) → **Redeploy**
3. Or wait for auto-deploy from new commit

---

## 🔍 If Still Error:

### Check Build Logs:
1. **Deployments** → Latest deployment
2. Click on deployment → **Build Logs**
3. **Copy error message** and share

### Common Issues:

#### Issue 1: "Cannot find package.json"
**Fix**: Root Directory must be `distrohub-frontend`

#### Issue 2: "vite: command not found"
**Fix**: Build Command should be `npm run build` (not `vite build`)

#### Issue 3: "TypeScript errors"
**Fix**: Already fixed ✅ (check latest commit)

---

## 📋 Quick Checklist:

- [ ] Vercel Dashboard → Settings → Root Directory = `distrohub-frontend`
- [ ] Build Command = `npm run build`
- [ ] Output Directory = `dist`
- [ ] Save settings
- [ ] Redeploy
- [ ] Check build logs for errors

---

**Next**: Vercel Dashboard এ Root Directory set করুন → Redeploy করুন

