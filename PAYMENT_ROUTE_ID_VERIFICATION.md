# Payment Route ID - End-to-End Verification

## Overview

This document verifies that payments created from Sales Order screen are properly linked to routes via `route_id` and appear correctly in SR Accountability.

---

## Pre-Verification: Check Migration Status

### SQL Query 1: Verify route_id Column Exists

```sql
-- Check if route_id column exists in payments table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'payments' 
AND column_name = 'route_id';
```

**Expected Result:**
- `column_name`: `route_id`
- `data_type`: `uuid`
- `is_nullable`: `YES`
- `column_default`: `NULL`

---

### SQL Query 2: Verify Index Exists

```sql
-- Check if index exists on payments.route_id
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'payments' 
AND indexname = 'idx_payments_route_id';
```

**Expected Result:**
- `indexname`: `idx_payments_route_id`
- `indexdef`: Contains `route_id`

---

## Test Scenario 1: Basic Flow Verification

### Step 1: Create Sale

**Action:** Create a new sales order (not in route yet)

**SQL Query to Verify:**
```sql
-- Get the latest sale
SELECT 
    id,
    invoice_number,
    retailer_id,
    retailer_name,
    total_amount,
    route_id,
    assigned_to,
    assigned_to_name
FROM sales
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**
- `route_id`: `NULL` (sale not in route yet)
- `assigned_to`: SR ID (if assigned)

---

### Step 2: Add Sale to Route

**Action:** Create route and add the sale to it

**SQL Query to Verify Route:**
```sql
-- Get the latest route
SELECT 
    id,
    route_number,
    assigned_to,
    assigned_to_name,
    status,
    total_orders,
    total_amount
FROM routes
ORDER BY created_at DESC
LIMIT 1;
```

**SQL Query to Verify Sale Updated:**
```sql
-- Verify sale.route_id and sale.assigned_to updated
SELECT 
    s.id,
    s.invoice_number,
    s.route_id,
    s.assigned_to as sale_sr,
    s.assigned_to_name as sale_sr_name,
    r.id as route_id_from_route,
    r.assigned_to as route_sr,
    r.assigned_to_name as route_sr_name,
    CASE 
        WHEN s.route_id = r.id THEN '✅ route_id matches'
        ELSE '❌ route_id mismatch'
    END as route_id_check,
    CASE 
        WHEN s.assigned_to = r.assigned_to THEN '✅ SR matches'
        ELSE '❌ SR mismatch'
    END as sr_check
FROM sales s
JOIN routes r ON s.route_id = r.id
WHERE s.id = '<SALE_ID>';  -- Replace with actual sale ID
```

**Expected Result:**
- `route_id_check`: `✅ route_id matches`
- `sr_check`: `✅ SR matches`
- `sale.route_id` = `route.id`
- `sale.assigned_to` = `route.assigned_to`

---

### Step 3: Record Payment from Sales Order Screen

**Action:** Create payment for the sale from Sales Order screen

**SQL Query to Verify Payment:**
```sql
-- Verify payment.route_id is populated
SELECT 
    p.id,
    p.sale_id,
    p.route_id as payment_route_id,
    s.route_id as sale_route_id,
    p.amount,
    p.collected_by,
    p.collected_by_name,
    CASE 
        WHEN p.route_id = s.route_id THEN '✅ route_id matches sale'
        WHEN p.route_id IS NULL AND s.route_id IS NULL THEN '✅ Both NULL (sale not in route)'
        WHEN p.route_id IS NULL AND s.route_id IS NOT NULL THEN '❌ Payment missing route_id'
        ELSE '❌ route_id mismatch'
    END as route_id_verification
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.id = '<PAYMENT_ID>';  -- Replace with actual payment ID
```

**Expected Result:**
- `route_id_verification`: `✅ route_id matches sale`
- `payment_route_id` = `sale_route_id` (both should match)

---

## Test Scenario 2: SR Accountability Verification

### SQL Query 3: Verify Payments Appear in SR Accountability

```sql
-- Get all payments for a specific SR's routes
SELECT 
    r.id as route_id,
    r.route_number,
    r.assigned_to as route_sr,
    r.assigned_to_name as route_sr_name,
    COUNT(DISTINCT p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_payments_amount,
    COUNT(DISTINCT CASE WHEN p.route_id IS NOT NULL THEN p.id END) as payments_with_route_id,
    COUNT(DISTINCT CASE WHEN p.route_id IS NULL THEN p.id END) as payments_without_route_id
FROM routes r
LEFT JOIN payments p ON p.route_id = r.id AND p.collected_by = r.assigned_to
WHERE r.assigned_to = '<SR_USER_ID>'  -- Replace with actual SR user ID
GROUP BY r.id, r.route_number, r.assigned_to, r.assigned_to_name
ORDER BY r.created_at DESC;
```

**Expected Result:**
- `payments_without_route_id`: `0` (all payments should have route_id)
- `total_payments_amount`: Should match SR Accountability "Total Collected"

---

### SQL Query 4: Compare SR Accountability Calculation

```sql
-- Manual calculation of SR Accountability totals
WITH route_totals AS (
    SELECT 
        r.assigned_to as sr_id,
        r.id as route_id,
        -- Total Expected (previous_due + current_bill for all sales)
        COALESCE(SUM(rs.previous_due + s.total_amount), 0) as total_expected,
        -- Total Collected from Payments
        COALESCE(SUM(DISTINCT p.amount), 0) as total_collected_from_payments,
        -- Total Collected from Reconciliations (only if no payments)
        COALESCE(SUM(CASE WHEN NOT EXISTS (
            SELECT 1 FROM payments p2 
            WHERE p2.route_id = r.id
        ) THEN rr.total_collected_cash ELSE 0 END), 0) as total_collected_from_recons,
        -- Total Returns
        COALESCE(SUM(rr.total_returns_amount), 0) as total_returns
    FROM routes r
    LEFT JOIN route_sales rs ON rs.route_id = r.id
    LEFT JOIN sales s ON s.id = rs.sale_id
    LEFT JOIN payments p ON p.route_id = r.id AND p.collected_by = r.assigned_to
    LEFT JOIN route_reconciliations rr ON rr.route_id = r.id
    WHERE r.assigned_to = '<SR_USER_ID>'  -- Replace with actual SR user ID
    GROUP BY r.assigned_to, r.id
)
SELECT 
    sr_id,
    COUNT(DISTINCT route_id) as route_count,
    SUM(total_expected) as total_expected_cash,
    SUM(total_collected_from_payments) as total_collected_from_payments,
    SUM(total_collected_from_recons) as total_collected_from_recons,
    SUM(total_collected_from_payments + total_collected_from_recons) as total_collected,
    SUM(total_returns) as total_returns,
    SUM(total_expected) - SUM(total_collected_from_payments + total_collected_from_recons) - SUM(total_returns) as current_outstanding
FROM route_totals
GROUP BY sr_id;
```

**Expected Result:**
- Should match SR Accountability API response values

---

## Test Scenario 3: Double-Count Safeguard Verification

### SQL Query 5: Verify Safeguard Logic

```sql
-- Check routes with both payments and reconciliations
SELECT 
    r.id as route_id,
    r.route_number,
    r.assigned_to as route_sr,
    -- Payments for this route
    COUNT(DISTINCT p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_payments,
    -- Reconciliation for this route
    COUNT(DISTINCT rr.id) as reconciliation_count,
    COALESCE(SUM(rr.total_collected_cash), 0) as total_reconciliation_collected,
    -- Safeguard check
    CASE 
        WHEN COUNT(DISTINCT p.id) > 0 AND COUNT(DISTINCT rr.id) > 0 
        THEN '⚠️ Route has BOTH payments and reconciliation - safeguard should exclude reconciliation'
        WHEN COUNT(DISTINCT p.id) > 0 
        THEN '✅ Route has payments only - use payments'
        WHEN COUNT(DISTINCT rr.id) > 0 
        THEN '✅ Route has reconciliation only - use reconciliation'
        ELSE 'ℹ️ Route has neither'
    END as safeguard_status
FROM routes r
LEFT JOIN payments p ON p.route_id = r.id AND p.collected_by = r.assigned_to
LEFT JOIN route_reconciliations rr ON rr.route_id = r.id
WHERE r.assigned_to = '<SR_USER_ID>'  -- Replace with actual SR user ID
GROUP BY r.id, r.route_number, r.assigned_to
HAVING COUNT(DISTINCT p.id) > 0 OR COUNT(DISTINCT rr.id) > 0
ORDER BY r.created_at DESC;
```

**Expected Result:**
- Routes with payments should show: `✅ Route has payments only - use payments`
- Routes with both should show: `⚠️ Route has BOTH payments and reconciliation - safeguard should exclude reconciliation`

---

### SQL Query 6: Verify Safeguard Calculation

```sql
-- Simulate SR Accountability calculation with safeguard
WITH route_data AS (
    SELECT 
        r.id as route_id,
        r.assigned_to as sr_id,
        -- Check if route has payments
        EXISTS(SELECT 1 FROM payments p WHERE p.route_id = r.id) as has_payments,
        -- Total from payments
        COALESCE((
            SELECT SUM(p.amount) 
            FROM payments p 
            WHERE p.route_id = r.id AND p.collected_by = r.assigned_to
        ), 0) as payments_total,
        -- Total from reconciliation (only if no payments - safeguard)
        COALESCE((
            SELECT SUM(rr.total_collected_cash)
            FROM route_reconciliations rr
            WHERE rr.route_id = r.id
            AND NOT EXISTS(SELECT 1 FROM payments p WHERE p.route_id = r.id)
        ), 0) as reconciliation_total
    FROM routes r
    WHERE r.assigned_to = '<SR_USER_ID>'  -- Replace with actual SR user ID
)
SELECT 
    sr_id,
    COUNT(*) as route_count,
    SUM(CASE WHEN has_payments THEN 1 ELSE 0 END) as routes_with_payments,
    SUM(CASE WHEN NOT has_payments THEN 1 ELSE 0 END) as routes_without_payments,
    SUM(payments_total) as total_from_payments,
    SUM(reconciliation_total) as total_from_reconciliations,
    SUM(payments_total + reconciliation_total) as total_collected
FROM route_data
GROUP BY sr_id;
```

**Expected Result:**
- `total_from_reconciliations`: Should be 0 for routes that have payments (safeguard working)
- `total_collected`: Should match SR Accountability API response

---

## Edge Cases to Test

### Edge Case 1: Payment for Sale NOT in Route

**Test:**
1. Create sale (not in route)
2. Record payment for sale

**SQL Query:**
```sql
-- Check payments for sales not in route
SELECT 
    p.id,
    p.sale_id,
    p.route_id,
    s.route_id as sale_route_id,
    CASE 
        WHEN p.route_id IS NULL AND s.route_id IS NULL THEN '✅ Correct (both NULL)'
        ELSE '❌ Mismatch'
    END as verification
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.route_id IS NULL
ORDER BY p.created_at DESC
LIMIT 10;
```

**Expected Result:**
- `verification`: `✅ Correct (both NULL)`
- `payment.route_id`: `NULL` (correct - sale not in route)

---

### Edge Case 2: Payment Created Before Sale Added to Route

**Test:**
1. Create sale
2. Record payment (payment.route_id = NULL)
3. Add sale to route (sale.route_id updated)

**SQL Query:**
```sql
-- Find payments that should have route_id but don't
SELECT 
    p.id,
    p.sale_id,
    p.route_id as payment_route_id,
    s.route_id as sale_route_id,
    p.created_at as payment_created_at,
    s.updated_at as sale_updated_at,
    CASE 
        WHEN p.route_id IS NULL AND s.route_id IS NOT NULL THEN '⚠️ Payment missing route_id (needs backfill)'
        WHEN p.route_id = s.route_id THEN '✅ Correct'
        ELSE '❌ Mismatch'
    END as status
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.route_id IS NOT NULL
AND (p.route_id IS NULL OR p.route_id != s.route_id)
ORDER BY p.created_at DESC;
```

**Expected Result:**
- If any rows found: These are historical payments that need backfilling
- **Action:** Run backfill query (see below)

---

### Edge Case 3: Sale Removed from Route After Payment

**Test:**
1. Create sale → Add to route → Record payment (payment.route_id set)
2. Remove sale from route (sale.route_id = NULL)

**SQL Query:**
```sql
-- Check payments where sale.route_id is NULL but payment.route_id is set
SELECT 
    p.id,
    p.sale_id,
    p.route_id as payment_route_id,
    s.route_id as sale_route_id,
    CASE 
        WHEN p.route_id IS NOT NULL AND s.route_id IS NULL THEN '⚠️ Payment has route_id but sale removed from route (historical record - OK)'
        ELSE '✅ Correct'
    END as status
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NOT NULL AND s.route_id IS NULL
ORDER BY p.created_at DESC;
```

**Expected Result:**
- `status`: `⚠️ Payment has route_id but sale removed from route (historical record - OK)`
- **Analysis:** This is OK - payment.route_id preserves historical route assignment

---

### Edge Case 4: Multiple Payments for Same Sale

**Test:**
1. Create sale → Add to route
2. Record multiple payments for the same sale

**SQL Query:**
```sql
-- Check multiple payments for same sale
SELECT 
    s.id as sale_id,
    s.invoice_number,
    s.route_id,
    COUNT(p.id) as payment_count,
    SUM(p.amount) as total_payment_amount,
    COUNT(DISTINCT p.route_id) as distinct_route_ids,
    CASE 
        WHEN COUNT(DISTINCT p.route_id) > 1 THEN '❌ Multiple route_ids for same sale'
        WHEN COUNT(DISTINCT p.route_id) = 1 AND MAX(p.route_id) = s.route_id THEN '✅ All payments have correct route_id'
        WHEN COUNT(DISTINCT p.route_id) = 1 AND MAX(p.route_id) IS NULL AND s.route_id IS NULL THEN '✅ All payments NULL (sale not in route)'
        ELSE '⚠️ Check needed'
    END as verification
FROM sales s
JOIN payments p ON p.sale_id = s.id
WHERE s.route_id IS NOT NULL
GROUP BY s.id, s.invoice_number, s.route_id
HAVING COUNT(p.id) > 1
ORDER BY payment_count DESC;
```

**Expected Result:**
- `verification`: `✅ All payments have correct route_id`
- `distinct_route_ids`: `1` (all payments should have same route_id)

---

## Backfill Query (For Historical Payments)

If there are existing payments that should have `route_id` but don't:

```sql
-- Backfill route_id for existing payments
UPDATE payments p
SET route_id = s.route_id
FROM sales s
WHERE p.sale_id = s.id
AND s.route_id IS NOT NULL
AND p.route_id IS NULL;

-- Verify backfill
SELECT 
    COUNT(*) as payments_updated,
    COUNT(DISTINCT route_id) as distinct_routes
FROM payments
WHERE route_id IS NOT NULL;
```

**Run this only if:** Edge Case 2 query finds payments missing route_id

---

## Verification Checklist

### ✅ Pre-Migration
- [ ] Migration file exists
- [ ] Migration has been run in Supabase
- [ ] `route_id` column exists in `payments` table
- [ ] Index `idx_payments_route_id` exists

### ✅ Basic Flow
- [ ] Create sale → `sale.route_id` = NULL
- [ ] Add sale to route → `sale.route_id` = route.id
- [ ] Record payment → `payment.route_id` = sale.route_id ✅

### ✅ SR Accountability
- [ ] Payments appear in SR Accountability
- [ ] Total Collected includes payment amounts
- [ ] Current Outstanding calculated correctly

### ✅ Double-Count Safeguard
- [ ] Routes with payments: reconciliation excluded ✅
- [ ] Routes without payments: reconciliation included ✅
- [ ] Mixed routes: correct totals ✅

### ✅ Edge Cases
- [ ] Payment for sale not in route: `route_id` = NULL ✅
- [ ] Multiple payments for same sale: all have same `route_id` ✅
- [ ] Sale removed from route: payment keeps historical `route_id` ✅

---

## SQL Queries Summary

| Query | Purpose | Expected Result |
|-------|---------|----------------|
| Query 1 | Check column exists | Column `route_id` exists |
| Query 2 | Check index exists | Index `idx_payments_route_id` exists |
| Query 3 | Verify payment.route_id | Matches sale.route_id |
| Query 4 | SR Accountability totals | Matches API response |
| Query 5 | Safeguard status | Routes with payments exclude reconciliation |
| Query 6 | Safeguard calculation | Correct totals |
| Edge Case 1 | Sale not in route | payment.route_id = NULL |
| Edge Case 2 | Historical payments | May need backfill |
| Edge Case 3 | Sale removed | payment.route_id preserved |
| Edge Case 4 | Multiple payments | All have same route_id |

---

## Expected Results Summary

### ✅ Success Criteria

1. **Payment Creation:**
   - ✅ `payment.route_id` = `sale.route_id` when sale is in route
   - ✅ `payment.route_id` = NULL when sale is not in route

2. **SR Accountability:**
   - ✅ Payments appear in accountability reports
   - ✅ Total Collected includes payment amounts
   - ✅ Calculations match manual SQL queries

3. **Double-Count Safeguard:**
   - ✅ Routes with payments: reconciliation excluded
   - ✅ Routes without payments: reconciliation included
   - ✅ No double-counting

4. **Edge Cases:**
   - ✅ All edge cases handled correctly
   - ✅ Historical data preserved

---

## Troubleshooting

### Issue: Payment.route_id is NULL for sale in route

**Possible Causes:**
1. Payment created before migration
2. Payment created before sale added to route
3. Code not deployed

**Solution:**
- Run backfill query
- Verify code is deployed
- Check logs for errors

---

### Issue: SR Accountability not showing payments

**Possible Causes:**
1. `payment.route_id` not set
2. `payment.collected_by` doesn't match route SR
3. Query logic issue

**Solution:**
- Verify `payment.route_id` is set
- Verify `payment.collected_by` matches `route.assigned_to`
- Check SR Accountability query logic

---

## Conclusion

After running all verification queries:

✅ **All queries pass** → System is working correctly  
⚠️ **Some queries fail** → Check specific edge cases and run backfill if needed  
❌ **Many queries fail** → Review migration and code deployment
