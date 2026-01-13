-- Complete Fix: Fix ALL payments for Jahid (both in routes and not in routes)
-- This ensures all payments are properly linked

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
  AND (p.collected_by IS NULL OR p.collected_by != s.assigned_to);

-- Step 2: Fix route_id for payments where sale is in a route
UPDATE payments p
SET route_id = s.route_id
FROM sales s
WHERE p.sale_id = s.id
  AND p.route_id IS NULL
  AND s.route_id IS NOT NULL;

-- Step 3: Final verification - ALL payments
SELECT 
  'All Payments' as category,
  COUNT(*) as total_count,
  SUM(p.amount) as total_amount
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)

UNION ALL

-- Payments in routes (should appear in SR Accountability)
SELECT 
  'Payments in Routes' as category,
  COUNT(*) as total_count,
  SUM(p.amount) as total_amount
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
AND s.route_id IS NOT NULL
AND p.collected_by = s.assigned_to
AND p.route_id = s.route_id;

COMMIT;
