# Vercel Deployment Fix - Main Branch

## Issue Identified

**Git Upstream Problem:**
```
Your branch is based on 'origin/main', but the upstream is gone.
```

This broken upstream reference can prevent Vercel from detecting new commits.

## Fix Applied

✅ **Fixed git upstream reference:**
```bash
git branch --unset-upstream
git branch --set-upstream-to=origin/main main
git fetch origin
```

## Vercel Configuration Check

### Root Directory Issue

**Problem:** There are TWO `vercel.json` files:
1. `vercel.json` (root) - Points to `distrohub-frontend/`
2. `distrohub-frontend/vercel.json` - Frontend-specific config

**Vercel needs to know:**
- **Root Directory:** `distrohub-frontend` (set in Vercel dashboard)
- **Build Command:** `npm run build` (from `distrohub-frontend/`)
- **Output Directory:** `dist` (from `distrohub-frontend/`)

### Current Configuration

**Root `vercel.json`:**
```json
{
  "buildCommand": "cd distrohub-frontend && npm run build",
  "outputDirectory": "distrohub-frontend/dist",
  "installCommand": "cd distrohub-frontend && npm install"
}
```

**Frontend `vercel.json`:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## Vercel Dashboard Settings

**Verify in Vercel Dashboard → Project Settings → General:**

1. **Root Directory:** Should be `distrohub-frontend`
   - If NOT set: Vercel will look in root, causing build failures
   - **Action:** Set Root Directory to `distrohub-frontend`

2. **Framework Preset:** Should be `Vite` or `Other`
   - Vercel should auto-detect from `distrohub-frontend/package.json`

3. **Build & Development Settings:**
   - Build Command: `npm run build` (or leave empty, uses `vercel.json`)
   - Output Directory: `dist` (or leave empty, uses `vercel.json`)
   - Install Command: `npm install` (or leave empty)

## Steps to Fix Deployment

### Step 1: Fix Git Upstream (Already Done)
```bash
git branch --set-upstream-to=origin/main main
git fetch origin
```

### Step 2: Verify Vercel Settings

1. Go to Vercel Dashboard
2. Select `distrohub-frontend` project
3. Go to **Settings → General**
4. Check **Root Directory**: Should be `distrohub-frontend`
5. If empty or wrong, set it to `distrohub-frontend`

### Step 3: Reconnect GitHub (If Needed)

1. Go to **Settings → Git**
2. Click **Disconnect** (if connected)
3. Click **Connect Git Repository**
4. Select `naimprince010-ship-it/DistroHub`
5. Configure:
   - **Production Branch:** `main`
   - **Root Directory:** `distrohub-frontend`
   - **Framework Preset:** `Vite` (or `Other`)
6. Click **Deploy**

### Step 4: Trigger New Deployment

**Option A: Push Empty Commit**
```bash
cd c:\Users\User\DistroHub
git commit --allow-empty -m "Trigger Vercel deployment"
git push origin main
```

**Option B: Make Small Change**
```bash
cd c:\Users\User\DistroHub
echo "" >> distrohub-frontend/README.md
git add distrohub-frontend/README.md
git commit -m "Trigger Vercel deployment"
git push origin main
```

**Option C: Manual Deploy in Vercel**
1. Go to Vercel Dashboard → Deployments
2. Click **Deploy** → **Deploy from Git**
3. Select `main` branch
4. Click **Deploy**

## Verification

After pushing, check:
1. **GitHub:** Verify commit appears in repository
2. **Vercel Dashboard:** New deployment should appear within 1-2 minutes
3. **Deployment Status:** Should show "Building" then "Ready"

## Common Issues

### Issue: "No deployments triggered"

**Causes:**
- Root directory not set in Vercel
- Git webhook not configured
- Broken git upstream (fixed above)

**Solution:**
1. Set Root Directory to `distrohub-frontend` in Vercel
2. Reconnect GitHub repository
3. Verify webhook in GitHub Settings → Webhooks

---

### Issue: "Build failing"

**Check Build Logs:**
- Go to Vercel Dashboard → Deployment → Build Logs
- Look for TypeScript errors, missing dependencies, etc.

**Common Causes:**
- Missing environment variables
- TypeScript errors
- Missing dependencies

**Solution:**
```bash
# Test build locally
cd distrohub-frontend
npm install
npm run build
```

---

### Issue: "Deployment succeeds but site doesn't update"

**Causes:**
- Browser cache
- CDN cache
- Deployment not promoted to production

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check if deployment is marked "Production"
3. Wait 1-2 minutes for CDN propagation

---

## Quick Checklist

- [x] Git upstream fixed
- [ ] Root Directory set to `distrohub-frontend` in Vercel
- [ ] Production branch set to `main` in Vercel
- [ ] Auto-deploy enabled in Vercel
- [ ] GitHub webhook active
- [ ] Recent commit pushed to main
- [ ] New deployment appears in Vercel dashboard

---

## Next Steps

1. **Set Root Directory in Vercel:**
   - Dashboard → Settings → General → Root Directory: `distrohub-frontend`

2. **Trigger Deployment:**
   ```bash
   git push origin main
   ```

3. **Monitor:**
   - Check Vercel dashboard for new deployment
   - Should appear within 1-2 minutes

---

## Note

Based on the screenshot, deployments **ARE working** (latest was 3 minutes ago). The issue might be:
- Root directory not set correctly
- Need to refresh Vercel dashboard
- Git upstream issue (now fixed)

After fixing git upstream and verifying Vercel settings, new deployments should trigger automatically on push to main.
