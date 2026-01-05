# Login Test Guide - Debug Steps

## 🔍 Current Status:
- ✅ Login page loads correctly
- ✅ All assets loading (200 status)
- ⚠️ Need to test actual login attempt

---

## 🧪 Test Login Steps:

### Step 1: Open Browser Console
1. Press **F12** or **Right-click** → **Inspect**
2. Go to **Console** tab (to see errors)
3. Keep **Network** tab open (to see API calls)

### Step 2: Attempt Login
1. Make sure fields are filled:
   - **Email**: `admin@distrohub.com`
   - **Password**: `admin123`
2. Click **Sign In** button

### Step 3: Check Network Tab
Look for a request to:
- **URL**: `https://distrohub-backend.onrender.com/api/auth/login`
- **Method**: `POST`
- **Status**: Should be `200` (success) or `401` (unauthorized)

### Step 4: Check Console Tab
Look for any errors:
- CORS errors
- Network errors
- JavaScript errors

---

## 🔍 Common Issues & Fixes:

### Issue 1: Request going to `localhost:8000`
**Symptom**: Network tab shows request to `http://localhost:8000/api/auth/login`
**Fix**: 
- Vercel Dashboard → Settings → Environment Variables
- Verify `VITE_API_URL` = `https://distrohub-backend.onrender.com`
- **Redeploy** (important!)

### Issue 2: CORS Error
**Symptom**: Console shows "CORS policy" error
**Fix**: Backend CORS is already configured, but check if backend is running

### Issue 3: 401 Unauthorized
**Symptom**: Network shows `401` status
**Possible causes**:
- Wrong credentials
- User doesn't exist in database
- Password hash mismatch

### Issue 4: Network Error / Failed Request
**Symptom**: Request fails or times out
**Fix**: 
- Check backend health: `https://distrohub-backend.onrender.com/healthz`
- Should return: `{"status":"ok"}`

---

## 📋 Quick Checklist:

- [ ] Open Browser Console (F12)
- [ ] Go to Network tab
- [ ] Fill login form
- [ ] Click Sign In
- [ ] Check Network tab for `/api/auth/login` request
- [ ] Check Console tab for errors
- [ ] Note the request URL and status code

---

## 🎯 What to Share:

After testing, share:
1. **Network tab**: What URL is the request going to?
2. **Status code**: 200, 401, 404, 500, or error?
3. **Console errors**: Any error messages?
4. **Request/Response**: What's in the request body and response?

---

**Next**: Try logging in and share what you see in Network/Console tabs!

