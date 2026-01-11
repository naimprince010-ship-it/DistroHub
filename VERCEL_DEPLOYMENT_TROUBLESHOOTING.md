# Vercel Deployment Troubleshooting Guide

## Current Status

Based on the screenshot, **Vercel deployments ARE happening on main branch**. Recent deployments show:
- ✅ Latest deployment: 3 minutes ago (Ready)
- ✅ Previous deployments from main: 6m, 13m, 17m ago (all Ready)
- ✅ All deployments are marked "Production" and "Ready"

## Potential Issues

### 1. Git Broken Ref Warning

**Issue:** Git shows warning: `warning: ignoring broken ref refs/remotes/origin/main`

**Impact:** This might prevent Vercel from properly detecting new commits.

**Fix:**
```bash
# Fix broken git ref
cd c:\Users\User\DistroHub
git remote remove origin
git remote add origin https://github.com/naimprince010-ship-it/DistroHub.git
git fetch origin
git branch --set-upstream-to=origin/main main
```

### 2. Vercel Project Settings

**Check in Vercel Dashboard:**
1. Go to Project Settings → Git
2. Verify:
   - ✅ Repository: `naimprince010-ship-it/DistroHub`
   - ✅ Production Branch: `main`
   - ✅ Auto-deploy: Enabled
   - ✅ Root Directory: `distrohub-frontend` (if using monorepo)

### 3. Build Configuration

**Current Configuration:**
- ✅ `vercel.json` exists in `distrohub-frontend/`
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`
- ✅ Framework: `vite`

**Verify:**
- Root Directory in Vercel should be: `distrohub-frontend`
- Build Command: `npm run build`
- Install Command: `npm install`

---

## Manual Deployment Trigger

If auto-deploy isn't working, you can manually trigger:

### Option 1: Via Vercel Dashboard
1. Go to Deployments tab
2. Click "Redeploy" on latest deployment
3. Or click "Deploy" → "Deploy from Git" → Select `main` branch

### Option 2: Via Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Deploy
cd distrohub-frontend
vercel --prod
```

---

## Verification Steps

### 1. Check Git Push
```bash
cd c:\Users\User\DistroHub
git push origin main
```

**Expected:** Should show successful push. If you see errors about broken ref, fix it first.

### 2. Check Vercel Webhook
1. Go to Vercel Dashboard → Project Settings → Git
2. Check "Deploy Hooks" section
3. Verify webhook URL is configured in GitHub

### 3. Check GitHub Webhook
1. Go to GitHub → Repository → Settings → Webhooks
2. Verify Vercel webhook exists and is active
3. Check recent deliveries for errors

---

## Common Issues & Solutions

### Issue: "No deployments triggered"

**Causes:**
- Broken git ref (fix above)
- Vercel webhook not configured
- Root directory mismatch

**Solution:**
1. Fix git ref (see above)
2. Reconnect GitHub in Vercel dashboard
3. Verify root directory is `distrohub-frontend`

---

### Issue: "Build failing"

**Check:**
- Build logs in Vercel dashboard
- TypeScript errors
- Missing environment variables

**Solution:**
```bash
# Test build locally
cd distrohub-frontend
npm run build
```

---

### Issue: "Deployment stuck"

**Solution:**
1. Cancel stuck deployment
2. Trigger new deployment manually
3. Check Vercel status page for outages

---

## Quick Fix Commands

### Fix Git Ref:
```bash
cd c:\Users\User\DistroHub
git remote remove origin
git remote add origin https://github.com/naimprince010-ship-it/DistroHub.git
git fetch origin
git branch --set-upstream-to=origin/main main
git push origin main
```

### Force New Deployment:
```bash
# Make a small change to trigger deployment
cd c:\Users\User\DistroHub
echo "# Deployment trigger" >> distrohub-frontend/README.md
git add distrohub-frontend/README.md
git commit -m "Trigger Vercel deployment"
git push origin main
```

---

## Verification Checklist

- [ ] Git ref is not broken (`git branch -a` should show `remotes/origin/main`)
- [ ] Recent commits are pushed to GitHub
- [ ] Vercel project is connected to correct repository
- [ ] Production branch is set to `main`
- [ ] Root directory is `distrohub-frontend`
- [ ] Auto-deploy is enabled
- [ ] Webhook is active in GitHub

---

## Current Configuration Summary

**Vercel Settings:**
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Root Directory: `distrohub-frontend` (should be set in Vercel dashboard)

**Git Status:**
- Current branch: `main`
- Recent commits: ✅ Pushed
- Broken ref warning: ⚠️ Needs fixing

---

## Next Steps

1. **Fix Git Ref** (if broken):
   ```bash
   git remote remove origin
   git remote add origin https://github.com/naimprince010-ship-it/DistroHub.git
   git fetch origin
   ```

2. **Verify Vercel Settings:**
   - Check root directory is `distrohub-frontend`
   - Verify production branch is `main`

3. **Test Deployment:**
   - Make a small change
   - Push to main
   - Check Vercel dashboard for new deployment

---

## Note

Based on the screenshot, deployments **ARE working**. The latest deployment was 3 minutes ago. If you're not seeing new deployments, it might be:
- Git ref issue preventing webhook triggers
- Vercel caching the deployment status
- Need to refresh the Vercel dashboard

Try refreshing the Vercel dashboard or checking the "Deployments" tab directly.
