# Backend Deploy করার Step-by-Step Guide

## 🚀 Render-এ Backend Deploy করার উপায়

### Option 1: GitHub থেকে Auto Deploy (সবচেয়ে সহজ)

#### Step 1: Code Commit করুন
```bash
cd distrohub-backend
git add app/main.py
git commit -m "Fix CORS configuration"
git push
```

#### Step 2: Render Auto Deploy
- যদি Render GitHub-এর সাথে connected থাকে, তাহলে automatically deploy হবে
- Render Dashboard → আপনার service → দেখবেন নতুন deployment start হয়েছে

---

### Option 2: Manual Deploy (Render Dashboard থেকে)

#### Step 1: Render Dashboard খুলুন
1. https://dashboard.render.com এ যান
2. Login করুন

#### Step 2: আপনার Service খুঁজুন
1. Dashboard-এ আপনার **distrohub-backend** service select করুন
2. **Manual Deploy** section-এ যান

#### Step 3: Manual Deploy করুন
1. **"Deploy latest commit"** button click করুন
2. অথবা **"Clear build cache & deploy"** click করুন (যদি problem থাকে)

---

### Option 3: Render CLI ব্যবহার করে

#### Step 1: Render CLI Install করুন
```bash
npm install -g render-cli
```

#### Step 2: Login করুন
```bash
render login
```

#### Step 3: Deploy করুন
```bash
cd distrohub-backend
render deploy
```

---

## ✅ Deploy করার পর কি করবেন

### Step 1: Deployment Status Check করুন
1. Render Dashboard → আপনার service
2. **Events** tab → Latest deployment check করুন
3. Status **"Live"** হওয়া পর্যন্ত wait করুন (~2-5 minutes)

### Step 2: Health Check করুন
Browser-এ open করুন:
```
https://distrohub-backend.onrender.com/healthz
```
Should return: `{"status":"ok"}`

### Step 3: CORS Test করুন
Browser console-এ:
```javascript
fetch('https://distrohub-backend.onrender.com/api/categories', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://distrohub-frontend.vercel.app',
    'Access-Control-Request-Method': 'POST'
  }
})
.then(r => {
  console.log('CORS Headers:', r.headers.get('access-control-allow-origin'));
})
```

### Step 4: Category Add Test করুন
1. Frontend-এ যান: https://distrohub-frontend.vercel.app/settings
2. Categories tab → Add Category
3. Category add করার চেষ্টা করুন
4. CORS error থাকবে না ✅

---

## 🔧 যদি Deploy Fail হয়

### Problem 1: Build Error
**Solution:**
1. Render Dashboard → Logs tab check করুন
2. Error message দেখুন
3. `requirements.txt` check করুন

### Problem 2: Environment Variables Missing
**Solution:**
1. Render Dashboard → Environment tab
2. Check করুন:
   - `USE_SUPABASE` = `true`
   - `SUPABASE_URL` = (your Supabase URL)
   - `SUPABASE_KEY` = (your Supabase key)
   - `JWT_SECRET_KEY` = (any random string)

### Problem 3: Service Not Starting
**Solution:**
1. Logs tab check করুন
2. Error message দেখুন
3. `Procfile` check করুন (should be: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`)

---

## 📝 Quick Checklist

Before Deploy:
- [ ] Code committed to GitHub
- [ ] CORS changes in `app/main.py`
- [ ] Environment variables set in Render

After Deploy:
- [ ] Deployment status: "Live"
- [ ] Health check: 200 OK
- [ ] CORS headers present
- [ ] Category creation works

---

## 🎯 Fastest Way (Recommended)

1. **GitHub-এ push করুন:**
   ```bash
   git add distrohub-backend/app/main.py
   git commit -m "Fix CORS for frontend"
   git push
   ```

2. **Render auto-deploy করবে** (যদি connected থাকে)

3. **2-5 minutes wait করুন**

4. **Test করুন**

---

## 📞 Help

যদি problem হয়:
1. Render Dashboard → Logs tab check করুন
2. Error message share করুন
3. আমি help করব

