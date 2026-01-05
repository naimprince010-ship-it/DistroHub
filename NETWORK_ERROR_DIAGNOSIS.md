# Network Error Diagnosis

## 🔍 Problem
Console shows: `ERR_NETWORK` with `response: undefined`

This means the request **never reached the backend server**.

## ✅ Fixes Applied

1. **Default API URL**: Changed default from `http://localhost:8000` to `https://distrohub-backend.onrender.com`
2. **Better logging**: Added API URL logging in development mode

## 🔧 Debugging Steps

### Step 1: Check API URL in Browser Console
```javascript
// Check what API URL is being used
import.meta.env.VITE_API_URL

// Should return: 'https://distrohub-backend.onrender.com'
// If undefined, the default will be used
```

### Step 2: Check Token
```javascript
// Check if token exists
localStorage.getItem('token')

// If null, you need to login again
```

### Step 3: Test API Directly
```javascript
// Test if backend is reachable
fetch('https://distrohub-backend.onrender.com/healthz')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Should return: {status: "ok"}
```

### Step 4: Test Category Endpoint with Token
```javascript
const token = localStorage.getItem('token');
fetch('https://distrohub-backend.onrender.com/api/categories', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'test',
    description: 'test',
    color: '#4F46E5'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 🎯 Common Causes

### 1. API URL Not Set in Vercel
**Symptom**: `import.meta.env.VITE_API_URL` returns `undefined`
**Solution**: 
1. Go to Vercel Dashboard
2. Project → Settings → Environment Variables
3. Add: `VITE_API_URL` = `https://distrohub-backend.onrender.com`
4. Redeploy

### 2. Backend Down or Slow
**Symptom**: Health check fails or times out
**Solution**: 
- Check Render dashboard
- Render free tier can be slow (cold starts)
- Wait and try again

### 3. CORS Issue
**Symptom**: Browser console shows CORS error
**Solution**: Backend CORS is already configured, but check if backend is running

### 4. Network Connectivity
**Symptom**: All requests fail
**Solution**: Check internet connection

## 📝 Next Steps

1. **Check Vercel Environment Variables**:
   - Go to: https://vercel.com/dashboard
   - Your project → Settings → Environment Variables
   - Verify `VITE_API_URL` is set to `https://distrohub-backend.onrender.com`
   - If not set, add it and redeploy

2. **Check Backend Status**:
   - Visit: https://distrohub-backend.onrender.com/healthz
   - Should return: `{"status":"ok"}`

3. **Test in Browser Console**:
   - Run the test commands above
   - Check what errors you get

## 🔍 What to Look For

In browser console:
- `[API] API URL:` - Should show the correct backend URL
- `[API] Request:` - Should show the request being made
- Network tab - Check if request appears and what status it gets

If you see `ERR_NETWORK`, it usually means:
- Request blocked before reaching server
- Backend not responding
- Network connectivity issue
- API URL incorrect

