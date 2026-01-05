# Debug Failed Login Request

## 🔍 Problem:
Login request showing `(failed)` status in just 33ms - too fast, suggests client-side issue.

**Network Tab Shows:**
- Status: `(failed)` ❌
- Type: `xhr`
- Time: `33 ms` (too fast - not reaching backend)
- Size: `0.0 kB`

---

## 🎯 Debug Steps:

### Step 1: Check Request URL
1. **Network tab** → Click on `login` request (the failed one)
2. Go to **Headers** tab
3. Check **Request URL**:
   - ✅ Should be: `https://distrohub-backend.onrender.com/api/auth/login`
   - ❌ Wrong if: `http://localhost:8000/api/auth/login`
   - ❌ Wrong if: `undefined/api/auth/login`

### Step 2: Check Console for Errors
1. **Console tab** → Look for red errors
2. Common errors:
   - `CORS policy`
   - `Network Error`
   - `Failed to fetch`
   - `ERR_CONNECTION_REFUSED`
   - `ERR_BLOCKED_BY_CLIENT`

### Step 3: Check Request Details
1. **Network tab** → `login` request → **Headers** tab
2. Check:
   - **Request Method**: Should be `POST`
   - **Request URL**: Full URL
   - **Status Code**: What error code?

### Step 4: Check Response Tab
1. **Network tab** → `login` request → **Response** tab
2. See if there's any error message

---

## 🔧 Common Issues & Fixes:

### Issue 1: Wrong URL (localhost)
**Symptom**: Request URL shows `http://localhost:8000`
**Fix**: 
- Vercel Dashboard → Settings → Environment Variables
- Verify `VITE_API_URL` = `https://distrohub-backend.onrender.com`
- **Redeploy** (important!)

### Issue 2: Environment Variable Not Set
**Symptom**: Request URL shows `undefined` or wrong
**Fix**:
- Vercel Dashboard → Settings → Environment Variables
- Add `VITE_API_URL` = `https://distrohub-backend.onrender.com`
- Select all environments (Production, Preview, Development)
- **Redeploy**

### Issue 3: CORS Error
**Symptom**: Console shows "CORS policy" error
**Fix**: Backend CORS is configured, but check if backend is running

### Issue 4: Network Error
**Symptom**: Console shows "Network Error" or "Failed to fetch"
**Fix**: 
- Check backend health: `https://distrohub-backend.onrender.com/healthz`
- Should return: `{"status":"ok"}`

---

## 📋 What to Check Now:

1. **Network tab** → `login` request → **Headers** → **Request URL**
2. **Console tab** → Any red errors?
3. **Network tab** → `login` request → **Response** tab
4. **New tab** → `https://distrohub-backend.onrender.com/healthz`

---

## 🧪 Quick Test:

**Console tab-এ type করুন:**
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
```

**Result:**
- ✅ Should show: `https://distrohub-backend.onrender.com`
- ❌ Wrong if: `undefined` or `http://localhost:8000`

---

**Next**: Network tab → `login` request → Headers tab → Request URL check করুন → Share করুন!

