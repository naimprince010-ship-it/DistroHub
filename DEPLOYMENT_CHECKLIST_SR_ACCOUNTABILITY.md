# SR Accountability Fix - Deployment Checklist

## ✅ Deployment Required: YES

**Date:** 2026-01-13  
**Status:** Backend code changes + Database migration needed

---

## 1. Database Migration (MANDATORY) ⚠️

### Step 1: Run Migration in Supabase

**File:** `distrohub-backend/supabase/migrations/20260113000002_create_backfill_payment_route_id_function.sql`

**Action:**
1. Go to **Supabase Dashboard** → Your Project
2. Open **SQL Editor**
3. Copy entire content from migration file
4. Paste and **Run** (Ctrl+Enter)

**What it does:**
- Creates PostgreSQL function `backfill_payment_route_id()`
- This function is required for the backfill endpoint to work

**Verification:**
```sql
-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'backfill_payment_route_id';
```

**Expected:** Should return 1 row

---

## 2. Backend Deployment (Render) ⚠️

### Why Backend Deployment is Needed:

**Code Changes:**
- ✅ `app/supabase_db.py` - Updated `backfill_payment_route_id()` function
- ✅ `app/main.py` - Admin endpoint `/api/admin/backfill-payment-route-id`
- ✅ Performance optimizations in `get_sr_accountability()`

**Action:**
1. **Render should auto-deploy** from GitHub `main` branch
2. **OR manually trigger:**
   - Go to Render Dashboard
   - Select your backend service
   - Click **Manual Deploy** → **Deploy latest commit**

**Verification:**
- Check Render logs for successful deployment
- Test endpoint: `POST /api/admin/backfill-payment-route-id?dry_run=true`

---

## 3. Frontend Deployment (Vercel) ❌

**Status:** NOT NEEDED

**Reason:** No frontend code changes for this fix

**Note:** Frontend already displays `current_outstanding` correctly (from previous fix)

---

## 4. Post-Deployment Steps

### Step 1: Verify Backend is Running
```bash
# Check backend health
curl https://your-backend-url.com/api/health
```

### Step 2: Test Backfill Endpoint (Dry-Run)
```bash
# Preview backfill (safe, no changes)
curl -X POST "https://your-backend-url.com/api/admin/backfill-payment-route-id?dry_run=true" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "status": "success",
  "dry_run": true,
  "payments_found": 150,
  "payments_needing_backfill": 120,
  "payments_updated": 0,
  "payments_still_missing": 120,
  "message": "Preview: 120 payments would be updated"
}
```

### Step 3: Execute Backfill (Production)
```bash
# Execute backfill (updates database)
curl -X POST "https://your-backend-url.com/api/admin/backfill-payment-route-id?dry_run=false" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "status": "success",
  "dry_run": false,
  "payments_found": 150,
  "payments_needing_backfill": 120,
  "payments_updated": 120,
  "payments_still_missing": 0,
  "message": "Updated 120 payments via single batch SQL UPDATE"
}
```

### Step 4: Verify SR Accountability
1. Open frontend → **SR Accountability** page
2. Select an SR
3. Check **Total Collected** - should now show correct amount (not 0)

---

## Deployment Summary

| Component | Status | Action Required |
|-----------|-------|------------------|
| **Database Migration** | ⚠️ | Run in Supabase SQL Editor |
| **Backend (Render)** | ⚠️ | Auto-deploy or manual trigger |
| **Frontend (Vercel)** | ✅ | No action needed |

---

## Quick Deployment Steps

### 1. Database (5 minutes)
```
Supabase Dashboard → SQL Editor → Run migration file
```

### 2. Backend (Auto or Manual)
```
Render Dashboard → Wait for auto-deploy OR Manual Deploy
```

### 3. Verify (2 minutes)
```
Test backfill endpoint → Execute backfill → Check SR Accountability
```

---

## Important Notes

✅ **Migration must run BEFORE backend deployment** (function needs to exist)  
✅ **Backfill is idempotent** (safe to run multiple times)  
✅ **Dry-run first** to preview changes  
✅ **No frontend changes** needed  

---

## Troubleshooting

### Error: Function not found
**Cause:** Migration not run  
**Fix:** Run migration in Supabase SQL Editor

### Error: RPC call failed
**Cause:** Function doesn't exist or permission issue  
**Fix:** Verify function exists, check `SECURITY DEFINER` in migration

### Backend deployment failed
**Cause:** Code error or dependency issue  
**Fix:** Check Render logs, verify all imports are correct

---

## Summary

**Deployment Required:**
1. ✅ **Database Migration** (Supabase SQL Editor)
2. ✅ **Backend Deployment** (Render - auto or manual)
3. ❌ **Frontend Deployment** (Not needed)

**Total Time:** ~10-15 minutes

**Status:** Ready for deployment ✅
