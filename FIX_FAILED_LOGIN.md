# Fix Failed Login - Step by Step

## 🔍 Problem:
- Login request: `(failed)` in 33ms
- Backend timeout (Render free tier might be spun down)

---

## 🎯 Immediate Checks:

### Check 1: Request URL
**Network tab-এ:**
1. `login` request click করুন
2. **Headers** tab → **Request URL** check করুন
3. **Share করুন**: কোন URL দেখাচ্ছে?

### Check 2: Console Errors
**Console tab-এ:**
1. Red errors আছে কিনা check করুন
2. **Share করুন**: কোন error দেখাচ্ছে?

### Check 3: Environment Variable
**Console tab-এ type করুন:**
```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
```
**Result share করুন**

---

## 🔧 Most Likely Issues:

### Issue 1: Environment Variable Not Set
**Symptom**: Request URL shows `http://localhost:8000`
**Fix**:
1. Vercel Dashboard → Settings → Environment Variables
2. Verify `VITE_API_URL` exists
3. Value: `https://distrohub-backend.onrender.com`
4. **Redeploy**

### Issue 2: Backend Spun Down
**Symptom**: Backend timeout
**Fix**: 
- Render free tier spins down after 15 min inactivity
- First request takes 30-60 seconds
- Wait longer or check Render dashboard

### Issue 3: Wrong URL in Build
**Symptom**: Request going to wrong URL
**Fix**: 
- Environment variable must be set BEFORE build
- Need to redeploy after setting variable

---

## 📋 Action Items:

1. **Network tab** → `login` request → **Headers** → Request URL check করুন
2. **Console tab** → Errors check করুন
3. **Console tab** → `import.meta.env.VITE_API_URL` check করুন
4. **Vercel Dashboard** → Environment Variables verify করুন

---

**Next**: Network tab → Headers → Request URL screenshot/share করুন!

