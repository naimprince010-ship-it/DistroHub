-- Find ALL payments for Jahid (both routes, all sales)
-- This will show if the missing payment (20,000 or 400) exists

-- Step 1: All payments for sales assigned to Jahid (regardless of route)
SELECT 
  p.id as payment_id,
  p.amount,
  p.collected_by,
  u_payment.name as collected_by_name,
  p.route_id as payment_route_id,
  s.invoice_number,
  s.route_id as sale_route_id,
  r.route_number,
  rs.id as route_sales_id,
  p.created_at,
  CASE 
    WHEN p.amount = 20000 THEN '🔍 Amount = 20,000'
    WHEN p.amount = 400 THEN '🔍 Amount = 400'
    WHEN p.amount = 13000 THEN '🔍 Amount = 13,000'
    WHEN s.route_id IS NULL THEN 'ℹ️ Sale not in route'
    WHEN rs.id IS NULL THEN '⚠️ Sale in route but NOT in route_sales'
    WHEN p.route_id IS NULL THEN '❌ Payment route_id is NULL'
    WHEN p.collected_by != s.assigned_to THEN '⚠️ collected_by mismatch'
    ELSE '✅ Correct'
  END as status
FROM payments p
JOIN sales s ON p.sale_id = s.id
LEFT JOIN users u_payment ON p.collected_by = u_payment.id
LEFT JOIN routes r ON s.route_id = r.id
LEFT JOIN route_sales rs ON rs.sale_id = s.id AND rs.route_id = s.route_id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
ORDER BY p.created_at DESC;

-- Step 2: Summary by amount
SELECT 
  p.amount,
  COUNT(*) as payment_count,
  STRING_AGG(DISTINCT s.invoice_number, ', ') as invoice_numbers,
  STRING_AGG(DISTINCT r.route_number, ', ') as route_numbers,
  SUM(p.amount) as total_for_this_amount
FROM payments p
JOIN sales s ON p.sale_id = s.id
LEFT JOIN routes r ON s.route_id = r.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
GROUP BY p.amount
ORDER BY p.amount DESC;
