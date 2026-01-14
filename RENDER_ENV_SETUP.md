# Render Environment Variables Setup

## Step 1: Add Google OAuth Variables to Render

1. Go to: https://render.com/dashboard
2. Select **distrohub-backend** service
3. Go to **Environment** tab
4. Add these 4 variables:

### Variable 1: GOOGLE_CLIENT_ID
- **Value**: Paste your Client ID from Google Cloud Console
- Format: `123456789-abcdefg.apps.googleusercontent.com`

### Variable 2: GOOGLE_CLIENT_SECRET
- **Value**: Paste your Client Secret from Google Cloud Console  
- Format: `GOCSPX-abcdefghijklmnop`
- ⚠️ Copy this NOW - it won't be viewable again after closing the dialog!

### Variable 3: GOOGLE_REDIRECT_URI
- **Value**: `https://distrohub-backend.onrender.com/api/auth/google/callback`

### Variable 4: FRONTEND_URL
- **Value**: `https://distrohub-frontend.vercel.app`

---

## Step 2: Restart Backend

After adding variables, Render will auto-restart, or manually deploy from **Events** tab.

---

## Step 3: Test

1. Go to: https://distrohub-frontend.vercel.app/login
2. Click **"Continue with Google"**
3. Sign in with Gmail
4. You'll be automatically logged in!

---

**Note**: Never commit credentials to Git. Only add them in Render environment variables.
