# Render Environment Variables Setup for Google OAuth

## ✅ Google OAuth Credentials Created

Based on your Google Cloud Console setup, you have:
- **Client ID**: `108532255770-l3e9v98bq5kt0tp0mlpiraao8klg6b9k.apps.googleusercontent.com`
- **Client Secret**: `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`

---

## Step 1: Add Environment Variables to Render

### 1.1 Go to Render Dashboard
1. Visit: https://render.com/dashboard
2. Find and click on your **distrohub-backend** service

### 1.2 Navigate to Environment Tab
1. Click on **Environment** tab (left sidebar)
2. Scroll down to see existing environment variables

### 1.3 Add Google OAuth Variables
Click **"Add Environment Variable"** and add these **4 variables** one by one:

#### Variable 1:
- **Key**: `GOOGLE_CLIENT_ID`
- **Value**: `108532255770-l3e9v98bq5kt0tp0mlpiraao8klg6b9k.apps.googleusercontent.com`
- Click **Save Changes**

#### Variable 2:
- **Key**: `GOOGLE_CLIENT_SECRET`
- **Value**: `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`
- Click **Save Changes**

#### Variable 3:
- **Key**: `GOOGLE_REDIRECT_URI`
- **Value**: `https://distrohub-backend.onrender.com/api/auth/google/callback`
- Click **Save Changes**

#### Variable 4:
- **Key**: `FRONTEND_URL`
- **Value**: `https://distrohub-frontend.vercel.app`
- Click **Save Changes**

---

## Step 2: Restart Backend Service

After adding all environment variables:
1. Go to **Events** tab in Render
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
   OR
3. Render will auto-restart when you save environment variables

---

## Step 3: Verify Setup

### 3.1 Check Environment Variables
In Render → Environment tab, verify all 4 variables are present:
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `GOOGLE_REDIRECT_URI`
- ✅ `FRONTEND_URL`

### 3.2 Test Google Login
1. Go to: https://distrohub-frontend.vercel.app/login
2. Click **"Continue with Google"** button
3. You should be redirected to Google login
4. Sign in with your Gmail
5. You'll be redirected back and logged in

---

## Important Notes

⚠️ **Client Secret Security:**
- The Client Secret (`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`) will NOT be viewable again after closing the Google Cloud Console dialog
- Make sure you've copied it to Render environment variables
- Never commit it to Git or expose it in frontend code

✅ **Redirect URI Match:**
- Your Google Cloud Console has: `https://distrohub-backend.onrender.com/api/auth/google/callback`
- Render environment variable should match exactly: `https://distrohub-backend.onrender.com/api/auth/google/callback`

---

## Quick Copy-Paste for Render

Copy these values directly into Render Environment Variables:

```
GOOGLE_CLIENT_ID=108532255770-l3e9v98bq5kt0tp0mlpiraao8klg6b9k.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://distrohub-backend.onrender.com/api/auth/google/callback
FRONTEND_URL=https://distrohub-frontend.vercel.app
```

---

## Troubleshooting

### If Google login doesn't work:
1. **Check Render logs**: Go to Render → Logs tab → Look for `[GOOGLE OAUTH]` messages
2. **Verify variables**: Make sure all 4 variables are set correctly
3. **Check redirect URI**: Must match exactly in Google Cloud Console
4. **Wait 5-10 minutes**: Google OAuth changes may take time to propagate

---

**Next Step:** Add these environment variables to Render, then test Google login!
