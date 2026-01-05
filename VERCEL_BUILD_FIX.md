# Vercel Build Error Fix

## ❌ Error:
```
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

## 🔍 Problem:
Vercel is trying to run `vite build` directly, but it should run `npm run build` which installs dependencies first.

## ✅ Solution:

### Option 1: Fix Vercel Project Settings (Recommended)

1. **Vercel Dashboard** → Your Project (`distrohub-frontend`)
2. **Settings** → **General**
3. **Root Directory**: Set to `distrohub-frontend` ⚠️ Important!
4. **Build & Development Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. **Save**

### Option 2: Verify package.json Scripts

Make sure `package.json` has:
```json
"scripts": {
  "build": "tsc -b && vite build",
  "dev": "vite"
}
```

✅ This is already correct in your `package.json`

### Option 3: Update vercel.json

I've updated `vercel.json` to include `rootDirectory`. 

**Next Steps:**
1. Commit and push the updated `vercel.json`:
   ```bash
   cd C:\Users\User\DistroHub
   git add distrohub-frontend/vercel.json
   git commit -m "Fix Vercel build configuration"
   git push origin main
   ```

2. **Vercel** will auto-detect and redeploy

---

## 🎯 Quick Fix Steps:

### Vercel Dashboard:
1. **Settings** → **General**
2. **Root Directory**: `distrohub-frontend` ✅
3. **Build Command**: `npm run build` ✅
4. **Output Directory**: `dist` ✅
5. **Save** → **Redeploy**

---

## ✅ Expected Result:

After fix, build logs should show:
```
==> Installing dependencies
==> Running "npm run build"
==> Building...
==> Build completed
==> Deployment successful
```

---

**Next**: Vercel Settings → Root Directory verify করুন → Redeploy করুন!

