# Backend Restart Instructions (Render)

## Render Dashboard-এ Backend Restart করার Steps:

### Method 1: Manual Restart (Recommended)

1. **Render Dashboard-এ যান:**
   - https://dashboard.render.com
   - Login করুন আপনার account দিয়ে

2. **Your Service Select করুন:**
   - Dashboard-এ আপনার backend service (distrohub-backend) click করুন
   - Service details page-এ যাবেন

3. **Manual Restart করুন:**
   - Top right corner-এ "Manual Deploy" button দেখবেন
   - বা "Deploys" tab-এ যান
   - "Manual Deploy" → "Deploy latest commit" click করুন
   
   **অথবা**
   
   - Service page-এ "Restart" button (circular arrow icon) click করুন
   - যদি "Restart" button না দেখেন, "Deploys" tab-এ "Create Deploy" click করুন

4. **Wait করুন:**
   - Deployment complete হতে 1-2 minute লাগতে পারে
   - Status "Live" দেখলে backend restart হয়েছে

---

### Method 2: Via Render CLI

যদি Render CLI installed থাকে:

```bash
# Install Render CLI (if not installed)
npm install -g render-cli

# Login to Render
render login

# Restart service
render services:restart <your-service-id>
```

---

### Method 3: Re-deploy (যদি restart কাজ না করে)

1. **Render Dashboard → Service → Deploys tab**
2. **"Create Deploy" button click করুন**
3. **"Deploy latest commit" select করুন**
4. **Deploy start হবে automatically**

---

## Verification (Backend Restart হয়েছে কিনা Check করা):

1. **Backend Logs Check করুন:**
   - Render Dashboard → Service → "Logs" tab
   - "Server started" বা similar message দেখবেন

2. **API Health Check করুন:**
   - Browser-এ visit করুন: `https://distrohub-backend.onrender.com/health`
   - (যদি health endpoint থাকে)
   
   **অথবা**
   
   - Browser-এ visit করুন: `https://distrohub-backend.onrender.com/docs`
   - FastAPI docs page দেখলে backend running

3. **Frontend Test করুন:**
   - Browser-এ frontend open করুন
   - Routes / Batches page-এ যান
   - "+ Create Route" button click করুন
   - যদি dropdowns populate হয়, backend working

---

## Common Issues:

**Backend restart হচ্ছে না:**
- Check করুন service status "Live" আছে কিনা
- Check করুন recent deploys-এ error আছে কিনা
- Service logs check করুন error messages-এর জন্য

**Backend crash করছে:**
- Service logs check করুন (Render Dashboard → Service → Logs)
- Environment variables check করুন (Settings → Environment)
- Database connection verify করুন

**Frontend still showing old data:**
- Browser hard refresh করুন (Ctrl+Shift+R / Cmd+Shift+R)
- Browser cache clear করুন
- Incognito/Private window-এ test করুন

---

## Quick Checklist:

1. ✅ Render Dashboard-এ service select করুন
2. ✅ "Manual Deploy" বা "Restart" click করুন
3. ✅ Status "Live" দেখুন
4. ✅ Frontend refresh করুন
5. ✅ Routes page test করুন
