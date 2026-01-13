-- Complete Fix: Auto-detect Jahid's ID and Fix Payments
-- This script automatically finds Jahid Islam's user ID and fixes payments

BEGIN;

-- Step 1: Fix collected_by (automatically uses Jahid's ID)
UPDATE payments p
SET collected_by = s.assigned_to
FROM sales s
WHERE p.sale_id = s.id
  AND s.assigned_to = (
    SELECT id FROM users 
    WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
    LIMIT 1
  )
  AND (p.collected_by IS NULL OR p.collected_by != s.assigned_to);

-- Step 2: Fix route_id
UPDATE payments p
SET route_id = s.route_id
FROM sales s
WHERE p.sale_id = s.id
  AND p.route_id IS NULL
  AND s.route_id IS NOT NULL;

-- Step 3: Verify the fix
SELECT 
  'After Fix' as status,
  COUNT(*) as total_payments,
  COUNT(p.collected_by) as with_collected_by,
  COUNT(p.route_id) as with_route_id,
  SUM(p.amount) as total_amount,
  STRING_AGG(DISTINCT p.collected_by::text, ', ') as collected_by_ids
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
AND s.route_id IS NOT NULL;

COMMIT;
