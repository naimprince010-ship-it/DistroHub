# Accountability Feature Deployment Checklist

## ✅ Step 1: Database Migration (সবচেয়ে গুরুত্বপূর্ণ!)

### Supabase-এ Migration Run করুন:

1. **Supabase Dashboard** খুলুন: https://supabase.com/dashboard
2. আপনার project select করুন
3. **SQL Editor** এ যান (বাম sidebar)
4. এই ফাইলটি open করুন:
   ```
   distrohub-backend/supabase/migrations/20260110000002_run_all_accountability_migrations.sql
   ```
5. সম্পূর্ণ SQL content copy করুন
6. Supabase SQL Editor-এ paste করুন
7. **Run** button click করুন
8. Success message দেখবেন

**Verification:**
```sql
-- Run this to verify columns were added
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('assigned_to', 'assigned_to_name');

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('collected_by', 'collected_by_name');
```

---

## ✅ Step 2: Backend Deployment

### Option A: Auto-Deploy (যদি GitHub integration আছে)

**Render/Railway auto-deploy করবে যখন:**
- আপনি code **git push** করবেন
- নতুন commit থাকবে

**Steps:**
1. Code commit করুন:
   ```bash
   git add .
   git commit -m "Add accountability feature: assigned_to and collected_by tracking"
   git push
   ```
2. Render/Railway automatically deploy করবে
3. Deployment logs check করুন dashboard-এ

### Option B: Manual Redeploy

**Render:**
1. Dashboard → Your Backend Service
2. **Manual Deploy** → **Deploy latest commit**

**Railway:**
1. Dashboard → Your Project
2. Service → **Redeploy**

---

## ✅ Step 3: Frontend Deployment

### Vercel Auto-Deploy (যদি GitHub integration আছে)

**Auto-deploy হবে যখন:**
- Code **git push** করবেন

**Steps:**
1. Code commit করুন (যদি এখনো না করে থাকেন):
   ```bash
   git add .
   git commit -m "Add accountability feature UI"
   git push
   ```
2. Vercel automatically deploy করবে
3. Deployment logs check করুন

### Manual Redeploy (যদি প্রয়োজন হয়)

1. **Vercel Dashboard** → Your Frontend Project
2. **Deployments** tab
3. Latest deployment → **Redeploy**

---

## ✅ Step 4: Verification (Test করুন)

### 1. Backend API Test:
```bash
# Health check
curl https://your-backend-url.railway.app/healthz

# Test users endpoint (new)
curl https://your-backend-url.railway.app/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test collection report endpoint (new)
curl https://your-backend-url.railway.app/api/reports/collection \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Frontend Test:
1. Browser-এ app open করুন
2. **Sales** page-এ যান
3. **New Order** button click করুন
4. **"কালেক্টর (Assigned To)"** dropdown দেখতে পাবেন ✅
5. একটি order create করুন assigned SR দিয়ে
6. Order list-এ **"টাকা জমা নিন"** button দেখতে পাবেন ✅
7. **Reports** page → **Collection Report** tab দেখতে পাবেন ✅

---

## 📋 Quick Checklist

- [ ] **Step 1**: Supabase-এ migration SQL run করা হয়েছে
- [ ] **Step 2**: Backend code git push করা হয়েছে
- [ ] **Step 3**: Backend deployment successful (Render/Railway logs check)
- [ ] **Step 4**: Frontend code git push করা হয়েছে
- [ ] **Step 5**: Frontend deployment successful (Vercel logs check)
- [ ] **Step 6**: Frontend-এ নতুন features test করা হয়েছে

---

## 🚨 Important Notes

1. **Migration আগে run করতে হবে** - Database columns না থাকলে backend error দেবে
2. **Backend deploy করার পর** frontend deploy করুন
3. **Environment variables** check করুন:
   - Backend: `USE_SUPABASE=true`, `SUPABASE_URL`, `SUPABASE_KEY`
   - Frontend: `VITE_API_URL` (backend URL)

---

## 🔍 Troubleshooting

### যদি Backend Error আসে:
- Check করুন migration run হয়েছে কিনা
- Supabase logs check করুন
- Backend logs check করুন (Render/Railway dashboard)

### যদি Frontend Error আসে:
- Browser console check করুন
- Network tab-এ API calls check করুন
- Vercel build logs check করুন

---

## ✅ Success Indicators

সবকিছু ঠিক থাকলে দেখবেন:

1. ✅ Sales form-এ "Assigned To" dropdown
2. ✅ Invoice-এ "টাকা জমা নিন" button
3. ✅ Payment history invoice details-এ
4. ✅ Reports-এ "Collection Report" tab
5. ✅ Color-coded SR names (green/yellow/red)
6. ✅ Collection statistics per SR

---

**Deployment complete হলে test করুন এবং feedback দিন!** 🚀
