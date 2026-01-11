# Payment Route ID Backfill - Production Execution Guide

## Quick Start

**One-time backfill to fix SR Accountability "Total Collected = 0" issue.**

---

## Prerequisites

1. ✅ Migration `20260113000000_add_route_id_to_payments.sql` applied
2. ✅ Migration `20260113000002_create_backfill_payment_route_id_function.sql` applied
3. ✅ Backend code deployed

---

## Execution Methods

### Method 1: Admin API Endpoint (Recommended)

**Step 1: Preview (Dry-Run)**
```bash
curl -X POST "https://your-api.com/api/admin/backfill-payment-route-id?dry_run=true" \
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

**Step 2: Execute**
```bash
curl -X POST "https://your-api.com/api/admin/backfill-payment-route-id?dry_run=false" \
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

---

### Method 2: CLI Script

**Step 1: Preview**
```bash
cd distrohub-backend
python scripts/backfill_payment_route_id.py
```

**Step 2: Execute**
```bash
cd distrohub-backend
python scripts/backfill_payment_route_id.py --execute
```

---

### Method 3: Direct SQL (If Function Exists)

**Run in Supabase SQL Editor:**
```sql
-- Execute backfill function
SELECT * FROM backfill_payment_route_id();
```

**Expected Output:**
```
payments_updated | payments_still_missing
-----------------|-----------------------
      120        |          0
```

---

## Verification

### SQL Query 1: Check Backfill Success
```sql
-- Should return 0 after backfill
SELECT COUNT(*) as payments_still_missing_route_id
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NULL
AND s.route_id IS NOT NULL;
```

**Expected:** 0

---

### SQL Query 2: Verify SR Accountability
```sql
-- Check payments by route for a specific SR
SELECT 
    r.route_number,
    COUNT(DISTINCT p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_collected
FROM routes r
LEFT JOIN payments p ON p.route_id = r.id AND p.collected_by = r.assigned_to
WHERE r.assigned_to = '<SR_USER_ID>'
GROUP BY r.id, r.route_number
ORDER BY r.created_at DESC;
```

**Expected:** All routes show payment counts and totals

---

### SQL Query 3: Overall Statistics
```sql
SELECT 
    COUNT(*) as total_payments,
    COUNT(route_id) as payments_with_route_id,
    COUNT(*) - COUNT(route_id) as payments_without_route_id,
    ROUND(100.0 * COUNT(route_id) / NULLIF(COUNT(*), 0), 2) as percent_with_route_id
FROM payments;
```

**Expected:** `percent_with_route_id` should be high (or 100% if all sales are in routes)

---

## Safety Features

✅ **Single Batch SQL:** Uses one UPDATE statement (no loops)  
✅ **Idempotent:** Safe to run multiple times  
✅ **Dry-run Mode:** Preview before executing  
✅ **Verification:** Returns count of remaining missing rows  
✅ **Atomic:** Single transaction (all or nothing)  

---

## Troubleshooting

### Issue: Function Not Found

**Error:** `function backfill_payment_route_id() does not exist`

**Solution:**
1. Run migration: `20260113000002_create_backfill_payment_route_id_function.sql`
2. Verify function exists:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'backfill_payment_route_id';
   ```

---

### Issue: RPC Call Fails

**Error:** `RPC call failed` or `permission denied`

**Solution:**
1. Check function exists (see above)
2. Verify function has `SECURITY DEFINER` (allows execution)
3. Check Supabase RLS policies allow execution

---

### Issue: Payments Still Missing route_id

**After backfill, some payments still have route_id = NULL**

**Possible Causes:**
- Sale not in route (expected - these should remain NULL)
- Sale.route_id changed after payment created (edge case)

**Verification:**
```sql
-- Check if remaining NULL payments are for sales not in routes
SELECT 
    COUNT(*) as payments_with_null_route_id,
    COUNT(CASE WHEN s.route_id IS NOT NULL THEN 1 END) as should_have_route_id
FROM payments p
LEFT JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NULL;
```

**Expected:** `should_have_route_id` = 0 (all NULL payments are for sales not in routes)

---

## Post-Backfill Checklist

- [ ] Backfill executed successfully
- [ ] `payments_still_missing` = 0 (or only for sales not in routes)
- [ ] SR Accountability shows correct totals
- [ ] No errors in logs
- [ ] Verification queries pass

---

## Summary

**What Was Fixed:**
- Historical payments now have `route_id` set via single batch SQL UPDATE
- SR Accountability shows correct "Total Collected"
- System is production-ready

**Execution Time:** < 1 second (single SQL statement)

**Risk Level:** LOW (idempotent, atomic, verified)
