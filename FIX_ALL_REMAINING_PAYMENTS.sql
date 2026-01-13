-- Complete Fix: Fix ALL payments for Jahid (including those not yet fixed)
-- This will fix both collected_by AND route_id for all payments

BEGIN;

-- Step 1: Fix collected_by for ALL payments where sale is assigned to Jahid
UPDATE payments p
SET collected_by = s.assigned_to
FROM sales s
WHERE p.sale_id = s.id
  AND s.assigned_to = (
    SELECT id FROM users 
    WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
    LIMIT 1
  )
  AND s.route_id IS NOT NULL
  AND (p.collected_by IS NULL OR p.collected_by != s.assigned_to);

-- Step 2: Fix route_id for ALL payments
UPDATE payments p
SET route_id = s.route_id
FROM sales s
WHERE p.sale_id = s.id
  AND p.route_id IS NULL
  AND s.route_id IS NOT NULL;

-- Step 3: Final verification
SELECT 
  'Final Status' as status,
  COUNT(*) as total_payments,
  COUNT(p.collected_by) as with_collected_by,
  COUNT(p.route_id) as with_route_id,
  SUM(p.amount) as total_amount,
  STRING_AGG(DISTINCT p.amount::text, ', ') as payment_amounts
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
AND s.route_id IS NOT NULL;

COMMIT;
