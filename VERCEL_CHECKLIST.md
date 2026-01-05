# Vercel Deployment Checklist

## ✅ Files Verified:

### 1. vercel.json Configuration:
- ✅ `rootDirectory`: `distrohub-frontend`
- ✅ `buildCommand`: `npm run build`
- ✅ `outputDirectory`: `dist`
- ✅ `framework`: `vite`
- ✅ Rewrites configured for SPA

### 2. package.json:
- ✅ Build script: `"build": "tsc -b && vite build"`
- ✅ All dependencies listed
- ✅ Vite in devDependencies

### 3. Environment Variables:
- ✅ `.env`: `VITE_API_URL=https://distrohub-backend.onrender.com`
- ✅ `.env.production`: `VITE_API_URL=https://distrohub-backend.onrender.com`

---

## 🔍 Vercel Dashboard এ Check করুন:

### 1. Project Settings:
- [ ] **Root Directory**: `distrohub-frontend` ✅
- [ ] **Framework Preset**: `Vite` ✅
- [ ] **Build Command**: `npm run build` ✅
- [ ] **Output Directory**: `dist` ✅
- [ ] **Install Command**: `npm install` ✅

### 2. Environment Variables:
- [ ] `VITE_API_URL` = `https://distrohub-backend.onrender.com` ✅
- [ ] Environment: Production, Preview, Development (সব) ✅

### 3. Latest Deployment:
- [ ] Status: ✅ Success / ❌ Failed
- [ ] Build logs check করুন
- [ ] Errors থাকলে fix করুন

### 4. Domain/URL:
- [ ] Frontend URL: `https://your-project.vercel.app`
- [ ] Custom domain (যদি থাকে)

---

## 🐛 Common Issues & Fixes:

### Issue 1: Build Fails - "vite: command not found"
**Fix**: 
- Root Directory = `distrohub-frontend` ✅
- Build Command = `npm run build` ✅

### Issue 2: Environment Variable Not Working
**Fix**:
- Variable name must start with `VITE_` ✅
- Redeploy after adding variable ✅

### Issue 3: 404 Errors on Routes
**Fix**:
- Rewrites configured in `vercel.json` ✅

---

## ✅ Verification Steps:

### 1. Check Deployment Status:
```
Vercel Dashboard → Deployments → Latest
```

### 2. Check Build Logs:
```
Vercel Dashboard → Latest Deployment → Build Logs
```

### 3. Test Frontend:
```
https://your-project.vercel.app
```

### 4. Test API Connection:
- Browser Console → Check `import.meta.env.VITE_API_URL`
- Should show: `https://distrohub-backend.onrender.com`

---

## 📋 Current Configuration Summary:

**Backend**: ✅ `https://distrohub-backend.onrender.com` (Working)
**Frontend**: ⏳ Vercel deployment in progress
**Environment Variable**: ✅ Set locally, needs verification in Vercel dashboard

---

**Next**: Vercel Dashboard → Settings verify করুন → Latest deployment check করুন

