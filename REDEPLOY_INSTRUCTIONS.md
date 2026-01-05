# Redeploy Instructions - Fix Network Error

## ✅ Current Status
- ✅ Environment variable `VITE_API_URL` is set correctly in Vercel
- ✅ Backend is running and responding (200 OK)
- ✅ Code has been updated with better error handling
- ⏳ **Frontend needs to be redeployed** to pick up changes

## 🚀 How to Redeploy

### Option 1: Manual Redeploy (Quickest)
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your **distrohub-frontend** project
3. Go to **Deployments** tab
4. Find the latest deployment
5. Click the **"..."** (three dots) menu
6. Select **"Redeploy"**
7. Wait for deployment to complete (~2-3 minutes)

### Option 2: Push a Commit (Automatic)
1. Make a small change (add a comment, update README, etc.)
2. Commit and push to your repository
3. Vercel will automatically deploy

### Option 3: Trigger via Vercel CLI
```bash
vercel --prod
```

## ✅ After Redeployment

### Step 1: Clear Browser Cache
- Open browser in **Incognito/Private mode**
- OR clear cache: `Ctrl+Shift+Delete` → Clear browsing data

### Step 2: Test the App
1. Visit: https://distrohub-frontend.vercel.app
2. Login with: `admin@distrohub.com` / `admin123`
3. Go to Settings → Category Management
4. Try adding a category

### Step 3: Check Browser Console
Open browser console (F12) and look for:
- `[API] API URL:` - Should show `https://distrohub-backend.onrender.com`
- `[API] Request:` - Should show requests being made
- No more `ERR_NETWORK` errors

## 🔍 Verification

### Check Environment Variable is Loaded
In browser console:
```javascript
import.meta.env.VITE_API_URL
// Should return: 'https://distrohub-backend.onrender.com'
```

### Test Backend Connection
```javascript
fetch('https://distrohub-backend.onrender.com/healthz')
  .then(r => r.json())
  .then(console.log)
// Should return: {status: "ok"}
```

## 📝 What Changed

1. **Default API URL**: Now defaults to production backend instead of localhost
2. **Better Logging**: API URL is logged in console for debugging
3. **Error Handling**: Better error messages for network issues
4. **Request Logging**: All API requests are logged with details

## ⚠️ Important Notes

- Environment variables are **only available after redeployment**
- Changes to code require a new build
- Render free tier can be slow (cold starts), so first request might timeout
- If still getting errors after redeploy, check browser console for details

## 🎯 Expected Result

After redeployment:
- ✅ No more `ERR_NETWORK` errors
- ✅ Category creation should work
- ✅ Console shows correct API URL
- ✅ Requests reach the backend successfully

