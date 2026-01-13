# Root Cause Found: Payments Not Linked to SR

## 🔴 Critical Discovery

**Supabase Query Result:** "No rows returned"

**Meaning:** Payments exist, but `collected_by` field is NOT set to "Jahid Islam"'s user ID.

**This is why:** SR Accountability shows Total Collected = 0

---

## ✅ Solution: Fix Payment `collected_by` Field

### Step 1: Find Jahid Islam's User ID

**Run in Supabase SQL Editor:**

```sql
-- Get Jahid Islam's user ID
SELECT id, name, role, email
FROM users
WHERE name LIKE '%Jahid%' AND role = 'sales_rep';
```

**Copy the `id` value** (you'll need it for Step 2)

---

### Step 2: Check All Payments (Not Filtered by collected_by)

**Run this to see ALL payments:**

```sql
-- Check all recent payments
SELECT 
  p.id,
  p.amount,
  p.collected_by,
  p.route_id,
  s.route_id as sale_route_id,
  s.invoice_number,
  s.assigned_to as sale_assigned_to,
  p.created_at
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.route_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;
```

**This will show:**
- Which payments have `collected_by` set
- Which payments have `collected_by` = NULL
- Which payments need to be linked to Jahid Islam

---

### Step 3: Fix Payment `collected_by` Field

**If payments have `collected_by` = NULL, run:**

```sql
-- Replace 'JAHID_USER_ID' with actual ID from Step 1
UPDATE payments p
SET collected_by = 'JAHID_USER_ID'  -- Replace with actual ID
FROM sales s
WHERE p.sale_id = s.id
  AND s.route_id IS NOT NULL
  AND s.assigned_to = 'JAHID_USER_ID'  -- Replace with actual ID
  AND (p.collected_by IS NULL OR p.collected_by != 'JAHID_USER_ID');
```

**OR if you know the sale invoice numbers:**

```sql
-- Fix specific payments by invoice number
UPDATE payments p
SET collected_by = (
  SELECT id FROM users WHERE name LIKE '%Jahid%' AND role = 'sales_rep' LIMIT 1
)
FROM sales s
WHERE p.sale_id = s.id
  AND s.invoice_number IN ('INV-20260112-XXX', 'INV-20260111-XXX')  -- Replace with actual invoice numbers
  AND p.collected_by IS NULL;
```

---

### Step 4: Fix Payment `route_id` Field

**After fixing `collected_by`, fix `route_id`:**

```sql
-- Backfill route_id
UPDATE payments p
SET route_id = s.route_id
FROM sales s
WHERE p.sale_id = s.id
  AND p.route_id IS NULL
  AND s.route_id IS NOT NULL;
```

---

### Step 5: Verify Complete Fix

**Run this comprehensive check:**

```sql
-- Complete verification
SELECT 
  COUNT(*) as total_payments,
  COUNT(p.collected_by) as with_collected_by,
  COUNT(p.route_id) as with_route_id,
  SUM(p.amount) as total_amount,
  COUNT(CASE WHEN p.collected_by = (SELECT id FROM users WHERE name LIKE '%Jahid%' AND role = 'sales_rep' LIMIT 1) THEN 1 END) as jahid_payments
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.route_id IS NOT NULL
  AND s.assigned_to = (SELECT id FROM users WHERE name LIKE '%Jahid%' AND role = 'sales_rep' LIMIT 1);
```

**Expected:**
- `with_collected_by` = 2 (both payments)
- `with_route_id` = 2 (both payments)
- `total_amount` = 20,400
- `jahid_payments` = 2

---

## 🚀 Complete Fix Script (All-in-One)

**Run this in Supabase SQL Editor (replace 'JAHID_USER_ID' with actual ID):**

```sql
-- Complete fix: collected_by + route_id
BEGIN;

-- Step 1: Get Jahid's ID (for reference)
DO $$
DECLARE
  jahid_id UUID;
BEGIN
  SELECT id INTO jahid_id
  FROM users
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep'
  LIMIT 1;
  
  RAISE NOTICE 'Jahid Islam User ID: %', jahid_id;
  
  -- Step 2: Fix collected_by for payments where sale is assigned to Jahid
  UPDATE payments p
  SET collected_by = jahid_id
  FROM sales s
  WHERE p.sale_id = s.id
    AND s.assigned_to = jahid_id
    AND (p.collected_by IS NULL OR p.collected_by != jahid_id);
  
  -- Step 3: Fix route_id
  UPDATE payments p
  SET route_id = s.route_id
  FROM sales s
  WHERE p.sale_id = s.id
    AND p.route_id IS NULL
    AND s.route_id IS NOT NULL;
END $$;

-- Step 4: Verify
SELECT 
  'After Fix' as status,
  COUNT(*) as total_payments,
  COUNT(p.collected_by) as with_collected_by,
  COUNT(p.route_id) as with_route_id,
  SUM(p.amount) as total_amount
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (SELECT id FROM users WHERE name LIKE '%Jahid%' AND role = 'sales_rep' LIMIT 1)
  AND s.route_id IS NOT NULL;

COMMIT;
```

---

## ✅ After Fix

1. **Refresh Accountability page:** `Ctrl + Shift + R`
2. **Select "Jahid Islam"**
3. **Expected:**
   - Total Collected = ৳20,400 ✅
   - Current Outstanding = ৳0 ✅

---

**Root Cause:** Payments don't have `collected_by` set to Jahid Islam's user ID!

**Solution:** Run Step 3 (Fix collected_by) + Step 4 (Fix route_id) in Supabase SQL Editor.
