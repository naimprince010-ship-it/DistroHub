# Payment Route ID Backfill - Checklist

## Pre-Backfill Verification

### ✅ Step 1: Verify Migration Applied
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'payments' AND column_name = 'route_id';
```
**Expected:** Column exists

### ✅ Step 2: Count Payments Needing Backfill
```sql
SELECT COUNT(*) as payments_to_fix
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NULL
AND s.route_id IS NOT NULL;
```
**Record Count:** _______________

---

## Backfill Execution

### ✅ Step 3: Run Preview Query
```sql
-- From: 20260113000001_backfill_payment_route_id.sql (Step 1)
SELECT 
    COUNT(*) as payments_to_update,
    COUNT(DISTINCT p.sale_id) as unique_sales,
    COUNT(DISTINCT s.route_id) as unique_routes,
    SUM(p.amount) as total_amount_to_fix
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NULL
AND s.route_id IS NOT NULL;
```
**Record Results:**
- Payments to update: _______________
- Unique sales: _______________
- Unique routes: _______________
- Total amount: _______________

### ✅ Step 4: Execute Backfill
```sql
-- From: 20260113000001_backfill_payment_route_id.sql (Step 2)
UPDATE payments p
SET route_id = s.route_id
FROM sales s
WHERE p.sale_id = s.id
AND p.route_id IS NULL
AND s.route_id IS NOT NULL;
```
**Execution Time:** _______________  
**Rows Affected:** _______________

---

## Post-Backfill Verification

### ✅ Step 5: Verify Backfill Success
```sql
-- From: 20260113000001_backfill_payment_route_id.sql (Step 3)
SELECT 
    COUNT(*) as payments_updated,
    COUNT(DISTINCT route_id) as unique_routes_linked
FROM payments
WHERE route_id IS NOT NULL;
```
**Expected:**
- payments_updated: Should match Step 3 count
- unique_routes_linked: Should match Step 3 unique_routes

**Actual Results:**
- payments_updated: _______________
- unique_routes_linked: _______________

### ✅ Step 6: Verify No Remaining Issues
```sql
-- From: BACKFILL_PAYMENT_ROUTE_ID_VERIFICATION.sql (Query 1)
SELECT COUNT(*) as payments_still_missing_route_id
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NULL
AND s.route_id IS NOT NULL;
```
**Expected:** 0  
**Actual:** _______________

### ✅ Step 7: Verify SR Accountability
```sql
-- From: BACKFILL_PAYMENT_ROUTE_ID_VERIFICATION.sql (Query 2)
SELECT 
    r.route_number,
    COUNT(DISTINCT p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_collected
FROM routes r
LEFT JOIN payments p ON p.route_id = r.id
WHERE r.assigned_to = '<SR_USER_ID>'
GROUP BY r.id, r.route_number;
```
**Expected:** All routes show payment counts and totals  
**Status:** ✅ / ❌

### ✅ Step 8: Overall Statistics
```sql
-- From: BACKFILL_PAYMENT_ROUTE_ID_VERIFICATION.sql (Query 3)
SELECT 
    COUNT(*) as total_payments,
    COUNT(route_id) as payments_with_route_id,
    COUNT(*) - COUNT(route_id) as payments_without_route_id
FROM payments;
```
**Record Results:**
- Total payments: _______________
- With route_id: _______________
- Without route_id: _______________ (should be 0 or only for sales not in routes)

---

## Final Verification

### ✅ Step 9: Test New Payment Creation
- [ ] Create new sale
- [ ] Add sale to route
- [ ] Record payment from Sales Order screen
- [ ] Verify `payment.route_id` is set automatically
- [ ] Check SR Accountability shows payment

### ✅ Step 10: Test SR Accountability
- [ ] Open SR Accountability page
- [ ] Select SR with routes
- [ ] Verify "Total Collected" includes backfilled payments
- [ ] Verify "Current Outstanding" calculated correctly

---

## Sign-Off

**Backfill Completed:** [ ] Yes [ ] No  
**Date:** _______________  
**Verified By:** _______________  
**Notes:** _______________

---

## Rollback Plan (If Needed)

If backfill causes issues, rollback with:
```sql
-- ROLLBACK: Clear route_id for all payments (use with caution)
-- UPDATE payments SET route_id = NULL;
```

**Note:** Only use if absolutely necessary. This will break SR Accountability again.
