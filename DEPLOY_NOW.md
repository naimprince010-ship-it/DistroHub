# 🚀 Backend Deploy করুন এখনই!

## ✅ দুইটি সহজ উপায়:

### Method 1: Render Dashboard থেকে (সবচেয়ে সহজ) ⭐

1. **Render Dashboard খুলুন:**
   - https://dashboard.render.com
   - Login করুন

2. **Service Select করুন:**
   - **"distrohub-backend"** service click করুন

3. **Deploy করুন:**
   - **Events** tab click করুন
   - **"Deploy latest commit"** button click করুন
   - অথবা **"..."** menu → **"Deploy"**

4. **Wait করুন:**
   - Status: "Building..." → "Deploying..." → "Live" ✅
   - Time: ~2-5 minutes

5. **Test করুন:**
   - https://distrohub-backend.onrender.com/healthz
   - Should return: `{"status":"ok"}`

---

### Method 2: Git Push (Auto Deploy)

যদি Render GitHub-এর সাথে connected থাকে:

```bash
# Terminal/PowerShell-এ:
cd distrohub-backend
git add app/main.py
git commit -m "Fix CORS configuration"
git push
```

Render automatically deploy করবে!

---

## 📝 Checklist:

- [ ] Render Dashboard open করেছেন
- [ ] distrohub-backend service select করেছেন
- [ ] Deploy button click করেছেন
- [ ] Deployment "Live" status দেখেছেন
- [ ] Health check test করেছেন
- [ ] Frontend-এ category add test করেছেন

---

## 🎯 Quick Steps (Render Dashboard):

```
1. https://dashboard.render.com → Login
2. distrohub-backend service → Click
3. Events tab → Click
4. "Deploy latest commit" → Click
5. Wait 2-5 minutes
6. Test! ✅
```

---

## ✅ After Deployment:

1. **Health Check:**
   ```
   https://distrohub-backend.onrender.com/healthz
   ```

2. **Frontend Test:**
   - https://distrohub-frontend.vercel.app/settings
   - Categories → Add Category
   - CORS error থাকবে না! ✅

---

**Render Dashboard থেকে manual deploy করুন - সবচেয়ে সহজ!** 🚀

