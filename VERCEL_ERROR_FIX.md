# Vercel Build Error Fix Guide

## 🔍 Error Analysis

Vercel deployments showing "Error" status. Local build works, so issue is likely configuration.

## ✅ Fix Steps:

### Step 1: Vercel Project Settings

1. **Vercel Dashboard** → `distrohub-frontend` project
2. **Settings** → **General** tab
3. **Root Directory**: 
   - **Option A**: Leave **EMPTY** (Vercel will auto-detect)
   - **Option B**: Set to `distrohub-frontend`
   - ⚠️ **Important**: If repo root is DistroHub, use `distrohub-frontend`
   - If project is already linked, might need to unlink and relink

### Step 2: Build & Development Settings

**Settings** → **Build & Development Settings**:

- **Framework Preset**: `Vite` (auto-detect)
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅
- **Install Command**: `npm install` ✅
- **Root Directory**: `distrohub-frontend` (if repo is monorepo)

### Step 3: Check Build Logs

1. **Deployments** → Latest failed deployment
2. **Build Logs** tab
3. Look for specific error message
4. Common errors:
   - "Cannot find module"
   - "Command not found"
   - "File not found"
   - "TypeScript errors"

### Step 4: Alternative - Remove vercel.json

If `vercel.json` is causing issues:

1. **Delete** `distrohub-frontend/vercel.json`
2. Let Vercel auto-detect configuration
3. Set settings manually in dashboard

---

## 🎯 Quick Fix (Try This First):

### Vercel Dashboard:
1. **Settings** → **General**
2. **Root Directory**: 
   - If empty → Set to `distrohub-frontend`
   - If set → Try **EMPTY** (auto-detect)
3. **Save**
4. **Redeploy**

---

## 📋 Common Issues:

### Issue 1: Root Directory Wrong
**Symptom**: "Cannot find package.json"
**Fix**: Set Root Directory correctly in Vercel dashboard

### Issue 2: Build Command Wrong
**Symptom**: "vite: command not found"
**Fix**: Use `npm run build` (not `vite build`)

### Issue 3: TypeScript Errors
**Symptom**: TypeScript compilation fails
**Fix**: Already fixed ✅

---

## 🔧 Manual Configuration (If Auto-Detect Fails):

1. **Settings** → **General**
   - Root Directory: `distrohub-frontend`

2. **Settings** → **Build & Development Settings**
   - Framework: `Vite`
   - Build Command: `cd distrohub-frontend && npm run build`
   - Output Directory: `distrohub-frontend/dist`
   - Install Command: `cd distrohub-frontend && npm install`

---

**Next**: Vercel Dashboard → Settings → Root Directory check করুন → Build logs দেখুন exact error কি

