# Payment Route ID Backfill - Production Runbook

## Overview

This runbook guides you through safely executing the one-time backfill to fix historical payments that have `route_id = NULL`.

**Problem:** Payments created before 2026-01-13 have `route_id = NULL`, causing SR Accountability to show 0 collected.

**Solution:** Backfill `payments.route_id` from `sales.route_id` for historical payments.

---

## Pre-Flight Checklist

### ✅ Step 1: Verify Migration Applied

```sql
-- Check if route_id column exists
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'payments' AND column_name = 'route_id';
```

**Expected:** Column `route_id` exists with type `uuid`

---

### ✅ Step 2: Backup Database (Recommended)

```sql
-- Create backup of payments table
CREATE TABLE payments_backup_20260113 AS SELECT * FROM payments;
```

**Or use Supabase Dashboard:** Database → Backups → Create Backup

---

### ✅ Step 3: Preview What Will Be Updated

**Option A: Via Admin API Endpoint (Recommended)**

```bash
# Get admin token first (login as admin)
curl -X POST "https://your-api.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Preview (dry-run)
curl -X POST "https://your-api.com/api/admin/backfill-payment-route-id?dry_run=true" \
  -H "Authorization: Bearer <admin_token>"
```

**Option B: Via CLI Script**

```bash
cd distrohub-backend
python scripts/backfill_payment_route_id.py
```

**Expected Response:**
```json
{
  "status": "success",
  "dry_run": true,
  "payments_found": 150,
  "payments_needing_backfill": 120,
  "payments_updated": 0,
  "mismatches_found": 0,
  "message": "Preview 120 payments"
}
```

**Record Results:**
- Payments found: _______________
- Payments needing backfill: _______________
- Mismatches: _______________

---

## Execution

### ✅ Step 4: Execute Backfill

**Option A: Via Admin API Endpoint**

```bash
# Execute (dry_run=false)
curl -X POST "https://your-api.com/api/admin/backfill-payment-route-id?dry_run=false" \
  -H "Authorization: Bearer <admin_token>"
```

**Option B: Via CLI Script**

```bash
cd distrohub-backend
python scripts/backfill_payment_route_id.py --execute
```

**Expected Response:**
```json
{
  "status": "success",
  "dry_run": false,
  "payments_found": 150,
  "payments_needing_backfill": 120,
  "payments_updated": 120,
  "mismatches_found": 0,
  "message": "Updated 120 payments"
}
```

**Record Results:**
- Payments updated: _______________
- Execution time: _______________
- Any errors: _______________

---

## Post-Execution Verification

### ✅ Step 5: Verify Backfill Success

**SQL Query:**
```sql
-- Should return 0 (all payments fixed)
SELECT COUNT(*) as payments_still_missing_route_id
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NULL
AND s.route_id IS NOT NULL;
```

**Expected:** 0

**Actual:** _______________

---

### ✅ Step 6: Verify SR Accountability

**Test Steps:**
1. Open SR Accountability page in frontend
2. Select an SR who has routes with payments
3. Verify "Total Collected" shows correct amount (not 0)

**Or via API:**
```bash
curl -X GET "https://your-api.com/api/users/<SR_USER_ID>/accountability" \
  -H "Authorization: Bearer <token>"
```

**Expected:** `total_collected_from_payments` > 0 for SRs with payments

---

### ✅ Step 7: Check for Mismatches

**SQL Query:**
```sql
-- Check for any mismatches
SELECT 
    p.id,
    p.sale_id,
    p.route_id as payment_route_id,
    s.route_id as sale_route_id
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.route_id IS NOT NULL
AND (p.route_id IS NULL OR p.route_id != s.route_id)
LIMIT 10;
```

**Expected:** 0 rows

**Actual:** _______________

---

## Rollback Plan (If Needed)

**⚠️ Only use if absolutely necessary**

```sql
-- ROLLBACK: Clear route_id for all payments
-- WARNING: This will break SR Accountability again
UPDATE payments SET route_id = NULL;
```

**Or restore from backup:**
```sql
-- Restore from backup table
TRUNCATE payments;
INSERT INTO payments SELECT * FROM payments_backup_20260113;
```

---

## Troubleshooting

### Issue: Backfill returns 0 payments found

**Possible Causes:**
- All payments already have route_id
- No payments exist for sales in routes

**Solution:**
- Verify with SQL: `SELECT COUNT(*) FROM payments WHERE route_id IS NULL AND sale_id IN (SELECT id FROM sales WHERE route_id IS NOT NULL);`
- If count > 0, check API/script logs for errors

---

### Issue: Mismatches found

**Possible Causes:**
- Sale was moved to different route after payment created
- Data inconsistency

**Solution:**
- Review mismatch details in response
- Manually fix if needed
- Re-run backfill

---

### Issue: SR Accountability still shows 0

**Possible Causes:**
- Backfill not executed
- Payments not linked to routes correctly
- Fallback logic not working

**Solution:**
1. Verify backfill completed: `SELECT COUNT(*) FROM payments WHERE route_id IS NOT NULL;`
2. Check SR Accountability logs for fallback messages
3. Verify `payment.collected_by` matches `route.assigned_to`

---

## Success Criteria

✅ **Backfill Complete:**
- [ ] All payments for sales in routes have `route_id` set
- [ ] No mismatches found
- [ ] SR Accountability shows correct totals

✅ **System Working:**
- [ ] New payments automatically get `route_id` (via `create_payment()`)
- [ ] SR Accountability includes all payments
- [ ] Fallback logic handles legacy payments

---

## Sign-Off

**Backfill Executed:** [ ] Yes [ ] No  
**Date:** _______________  
**Executed By:** _______________  
**Payments Updated:** _______________  
**Verification Status:** [ ] Passed [ ] Failed  
**Notes:** _______________

---

## Post-Backfill Monitoring

**Monitor for 24 hours:**
- [ ] Check error logs for any issues
- [ ] Verify SR Accountability calculations
- [ ] Confirm no double-counting
- [ ] Test new payment creation

---

## Summary

**What Was Fixed:**
- Historical payments now have `route_id` set
- SR Accountability shows correct totals
- Fallback logic handles edge cases

**What's Protected:**
- New payments automatically get `route_id`
- System is backward compatible
- No breaking changes

**Next Steps:**
- Monitor for 24 hours
- Verify SR Accountability reports
- No further action needed (one-time fix)
