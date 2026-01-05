# Vercel Environment Variable Setup

## Issue
The frontend cannot connect to the backend because `VITE_API_URL` is not set correctly in Vercel.

## Solution

### Step 1: Set Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `distrohub-frontend` (or your project name)
3. Go to **Settings** → **Environment Variables**
4. Add/Update the following variable:

   **Name:** `VITE_API_URL`
   
   **Value:** `https://distrohub-backend.onrender.com`
   
   **Environment:** Select all (Production, Preview, Development)

5. Click **Save**

### Step 2: Redeploy

After setting the environment variable:

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (2-3 minutes)

### Step 3: Verify

After redeployment, check browser console:

✅ **Expected:**
```
[API] API URL: https://distrohub-backend.onrender.com
[API] VITE_API_URL env: https://distrohub-backend.onrender.com
[API] URL validation: PASSED
```

❌ **If you see:**
```
[API] ERROR: VITE_API_URL environment variable is not set!
```
→ Environment variable not set correctly in Vercel

❌ **If you see:**
```
[API] ERROR: Invalid API URL: "..."
```
→ URL format is incorrect (check for typos like "onrender" without ".com")

### Step 4: Test API Call

1. Open browser DevTools → Network tab
2. Navigate to Products page
3. Check for `GET /api/categories` request:
   - **Status:** 200 OK
   - **Response:** JSON array with categories including "Minarel water"

## Important Notes

- **No hardcoded fallback:** The code now requires `VITE_API_URL` to be set
- **Validation:** URL must contain "onrender.com" and be a valid URL format
- **Case sensitive:** Variable name must be exactly `VITE_API_URL` (Vite prefix required)
- **Redeploy required:** Environment variable changes require redeployment

## Troubleshooting

### Issue: Still getting 401 errors
- Check if token is saved in localStorage after login
- Verify backend is running: https://distrohub-backend.onrender.com/docs

### Issue: Environment variable not taking effect
- Ensure variable name is exactly `VITE_API_URL`
- Ensure it's set for the correct environment (Production/Preview/Development)
- Redeploy after setting the variable
- Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: Wrong URL in console
- Double-check Vercel environment variable value
- Ensure no trailing slash: `https://distrohub-backend.onrender.com` (not `...onrender.com/`)
- Ensure no typos: `onrender.com` (not `onrender` or `onrender.co`)
