# Render Dashboard থেকে Manual Deploy

## 🚀 Step-by-Step Guide

### Step 1: Render Dashboard খুলুন
1. Browser-এ যান: https://dashboard.render.com
2. Login করুন আপনার account দিয়ে

### Step 2: আপনার Service খুঁজুন
1. Dashboard-এ **"distrohub-backend"** service click করুন
2. Service page open হবে

### Step 3: Manual Deploy করুন

**Option A: Events Tab থেকে**
1. **Events** tab click করুন (sidebar-এ)
2. Latest commit দেখবেন
3. **"Deploy"** button click করুন
4. অথবা **"..."** (three dots) menu → **"Deploy latest commit"**

**Option B: Manual Deploy Section**
1. Service page-এ scroll down করুন
2. **"Manual Deploy"** section খুঁজুন
3. **"Deploy latest commit"** button click করুন
4. অথবা **"Clear build cache & deploy"** (যদি problem থাকে)

### Step 4: Deployment Status Watch করুন
1. **Events** tab-এ যান
2. নতুন deployment দেখবেন:
   - Status: "Building..." → "Deploying..." → "Live" ✅
3. Wait করুন (~2-5 minutes)

### Step 5: Verify করুন
1. Deployment complete হওয়ার পর
2. Browser-এ test করুন:
   ```
   https://distrohub-backend.onrender.com/healthz
   ```
   Should return: `{"status":"ok"}`

---

## 🔄 Alternative: Git Push (Auto Deploy)

যদি Render GitHub-এর সাথে connected থাকে:

```bash
cd distrohub-backend
git add app/main.py
git commit -m "Fix CORS configuration"
git push
```

Render automatically detect করবে এবং deploy করবে!

---

## 📸 Screenshots Guide

### Render Dashboard Layout:
```
Dashboard
├── Services
│   └── distrohub-backend (click here)
│       ├── Overview
│       ├── Logs
│       ├── Events ← (Manual Deploy এখানে)
│       ├── Metrics
│       └── Settings
```

### Events Tab:
- Latest commit দেখবেন
- **"Deploy"** button আছে
- Click করুন → Deployment start হবে

---

## ✅ After Deployment

1. **Wait 2-5 minutes** for deployment
2. **Check status**: Events tab → "Live" ✅
3. **Test health**: https://distrohub-backend.onrender.com/healthz
4. **Test frontend**: Category add করার চেষ্টা করুন

---

## 🎯 Quick Steps Summary

1. ✅ Render Dashboard open করুন
2. ✅ distrohub-backend service select করুন
3. ✅ Events tab → Deploy button click করুন
4. ✅ Wait for "Live" status
5. ✅ Test করুন!

---

**আপনি Render dashboard থেকে manual deploy করতে পারবেন!** 🚀

