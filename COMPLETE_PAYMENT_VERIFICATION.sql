-- COMPLETE VERIFICATION: Find ALL payments and verify route_sales linkage
-- This will help identify why only 1 payment (13,000) is showing up

-- Step 1: Find ALL payments (regardless of route or SR assignment)
SELECT 
  p.id as payment_id,
  p.amount,
  p.collected_by,
  u_payment.name as collected_by_name,
  p.route_id as payment_route_id,
  p.sale_id,
  s.invoice_number,
  s.assigned_to as sale_assigned_to,
  u_sale.name as sale_assigned_to_name,
  s.route_id as sale_route_id,
  r.route_number,
  rs.id as route_sales_id,  -- Check if sale is in route_sales junction table
  p.created_at,
  CASE 
    WHEN p.amount = 20000 THEN '🔍 Amount = 20,000'
    WHEN p.amount = 400 THEN '🔍 Amount = 400'
    WHEN p.amount = 13000 THEN '🔍 Amount = 13,000'
    WHEN rs.id IS NULL AND s.route_id IS NOT NULL THEN '⚠️ Sale in route but NOT in route_sales (missing junction)'
    WHEN rs.id IS NOT NULL THEN '✅ Sale in route_sales'
    WHEN s.route_id IS NULL THEN 'ℹ️ Sale not in route'
    ELSE '❓ Unknown'
  END as status
FROM payments p
JOIN sales s ON p.sale_id = s.id
LEFT JOIN users u_payment ON p.collected_by = u_payment.id
LEFT JOIN users u_sale ON s.assigned_to = u_sale.id
LEFT JOIN routes r ON s.route_id = r.id
LEFT JOIN route_sales rs ON rs.sale_id = s.id AND rs.route_id = s.route_id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY p.created_at DESC;

-- Step 2: Check route_sales for Jahid's routes
SELECT 
  r.id as route_id,
  r.route_number,
  r.assigned_to as route_sr_id,
  u.name as route_sr_name,
  COUNT(DISTINCT rs.sale_id) as sales_in_route,
  COUNT(DISTINCT p.id) as payments_for_route,
  COALESCE(SUM(p.amount), 0) as total_payments_amount
FROM routes r
LEFT JOIN users u ON r.assigned_to = u.id
LEFT JOIN route_sales rs ON rs.route_id = r.id
LEFT JOIN sales s ON s.id = rs.sale_id
LEFT JOIN payments p ON p.sale_id = s.id AND p.collected_by = r.assigned_to
WHERE r.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
GROUP BY r.id, r.route_number, r.assigned_to, u.name
ORDER BY r.created_at DESC;

-- Step 3: Find payments that should be counted but aren't
-- (Payments where sale is in route but payment is not being counted)
SELECT 
  p.id as payment_id,
  p.amount,
  s.invoice_number,
  s.route_id as sale_route_id,
  p.route_id as payment_route_id,
  rs.id as route_sales_id,
  CASE 
    WHEN rs.id IS NULL THEN '❌ Payment NOT counted: Sale missing from route_sales'
    WHEN p.collected_by != r.assigned_to THEN '❌ Payment NOT counted: collected_by mismatch'
    WHEN p.route_id IS NULL THEN '⚠️ Payment route_id is NULL (will use fallback)'
    ELSE '✅ Should be counted'
  END as why_not_counted
FROM payments p
JOIN sales s ON p.sale_id = s.id
LEFT JOIN routes r ON s.route_id = r.id
LEFT JOIN route_sales rs ON rs.sale_id = s.id AND rs.route_id = s.route_id
WHERE s.route_id IS NOT NULL
  AND r.assigned_to = (
    SELECT id FROM users 
    WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
    LIMIT 1
  )
  AND (rs.id IS NULL OR p.collected_by != r.assigned_to OR p.route_id IS NULL);
