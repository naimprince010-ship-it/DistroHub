# Google OAuth Setup Guide

## Overview
This guide explains how to set up Google OAuth authentication for DistroHub, allowing users to login with their Gmail accounts.

## Prerequisites
- Google Cloud Console account
- Access to backend environment variables (Render)
- Access to frontend environment variables (Vercel)

---

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable **Google+ API** (if not already enabled)

### 1.2 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen:
   - User Type: **External** (for public use)
   - App name: **DistroHub**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Add `email`, `profile`, `openid`
   - Test users: Add your Gmail address
   - Click **Save and Continue**

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **DistroHub Web Client**
   - Authorized JavaScript origins:
     ```
     https://distrohub-frontend.vercel.app
     https://distrohub-backend.onrender.com
     http://localhost:5173 (for local development)
     ```
   - Authorized redirect URIs:
     ```
     https://distrohub-backend.onrender.com/api/auth/google/callback
     http://localhost:8000/api/auth/google/callback (for local development)
     ```
   - Click **Create**

5. **Save the credentials:**
   - **Client ID**: Copy this (e.g., `123456789-abcdefg.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (e.g., `GOCSPX-abcdefghijklmnop`)

---

## Step 2: Configure Backend Environment Variables

### 2.1 Render Dashboard
1. Go to: https://render.com/dashboard
2. Select your **distrohub-backend** service
3. Go to **Environment** tab
4. Add the following variables:

```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://distrohub-backend.onrender.com/api/auth/google/callback
FRONTEND_URL=https://distrohub-frontend.vercel.app
```

### 2.2 Local Development (.env file)
Create or update `distrohub-backend/.env`:
```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

---

## Step 3: Install Dependencies

### Backend
The `authlib` package has been added to `requirements.txt`. Deploy to Render to install it automatically, or run locally:
```bash
cd distrohub-backend
pip install authlib==1.3.0
```

---

## Step 4: Test Google OAuth

### 4.1 Test Flow
1. Go to: https://distrohub-frontend.vercel.app/login
2. Click **"Continue with Google"** button
3. You'll be redirected to Google login
4. Sign in with your Gmail account
5. Grant permissions
6. You'll be redirected back to DistroHub and logged in automatically

### 4.2 Verify User Creation
1. After first Google login, check Supabase:
   - Go to **Table Editor** → **users** table
   - Find your Gmail address
   - User should be created with `role = 'sales_rep'`

---

## Step 5: Troubleshooting

### Issue: "OAuth not configured"
**Solution:** Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Render environment variables.

### Issue: "Redirect URI mismatch"
**Solution:** 
- Check Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs
- Ensure `https://distrohub-backend.onrender.com/api/auth/google/callback` is added
- Wait 5-10 minutes for changes to propagate

### Issue: "Token exchange failed"
**Solution:**
- Verify `GOOGLE_CLIENT_SECRET` is correct
- Check backend logs in Render dashboard
- Ensure redirect URI matches exactly

### Issue: "User info fetch failed"
**Solution:**
- Verify Google+ API is enabled in Google Cloud Console
- Check that scopes include `email` and `profile`

---

## API Endpoints

### `GET /api/auth/google`
Initiates Google OAuth flow. Redirects user to Google login.

### `GET /api/auth/google/callback`
Handles Google OAuth callback:
- Exchanges authorization code for access token
- Fetches user info from Google
- Creates/updates user in database
- Generates JWT token
- Redirects to frontend with token

---

## Security Notes

1. **Client Secret**: Never expose in frontend code. Only use in backend.
2. **HTTPS**: Always use HTTPS in production (Vercel/Render provide this).
3. **Token Storage**: JWT tokens are stored in localStorage (consider httpOnly cookies for production).
4. **User Creation**: New Google users are created with `role = 'sales_rep'` by default.

---

## Code Changes

### Frontend (`Login.tsx`)
- Added "Continue with Google" button
- Added `handleGoogleLogin()` function
- Added `useEffect` to handle OAuth callback

### Backend (`main.py`)
- Added `GET /api/auth/google` endpoint
- Added `GET /api/auth/google/callback` endpoint
- Auto-creates users on first Google login

### Dependencies
- Added `authlib==1.3.0` to `requirements.txt`

---

## Next Steps

1. ✅ Set up Google OAuth credentials
2. ✅ Configure environment variables in Render
3. ✅ Deploy backend changes
4. ✅ Test Google login flow
5. ✅ Verify user creation in database

---

**Status:** Ready to use after environment variables are configured.
