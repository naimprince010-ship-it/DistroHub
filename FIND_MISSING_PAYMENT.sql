-- Find the missing payment (should be 20,400 total but only 13,000 found)
-- This query checks ALL payments, not just those in routes

-- Step 1: Check ALL payments (including those not in routes)
SELECT 
  p.id,
  p.amount,
  p.collected_by,
  p.route_id,
  s.route_id as sale_route_id,
  s.assigned_to as sale_assigned_to,
  s.invoice_number,
  p.created_at,
  CASE 
    WHEN s.route_id IS NULL THEN '⚠️ Sale not in route'
    WHEN p.collected_by IS NULL THEN '❌ Missing collected_by'
    WHEN p.route_id IS NULL THEN '❌ Missing route_id'
    WHEN p.collected_by != s.assigned_to THEN '⚠️ collected_by mismatch'
    ELSE '✅ Correct'
  END as status
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
ORDER BY p.created_at DESC;

-- Step 2: Summary of ALL payments (in routes and not in routes)
SELECT 
  COUNT(*) as total_payments,
  COUNT(CASE WHEN s.route_id IS NOT NULL THEN 1 END) as payments_in_routes,
  COUNT(CASE WHEN s.route_id IS NULL THEN 1 END) as payments_not_in_routes,
  SUM(p.amount) as total_amount,
  SUM(CASE WHEN s.route_id IS NOT NULL THEN p.amount ELSE 0 END) as amount_in_routes,
  SUM(CASE WHEN s.route_id IS NULL THEN p.amount ELSE 0 END) as amount_not_in_routes
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
);

-- Step 3: Check if there are payments with different amounts
SELECT 
  p.amount,
  COUNT(*) as count,
  STRING_AGG(s.invoice_number, ', ') as invoice_numbers
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
GROUP BY p.amount
ORDER BY p.amount DESC;
