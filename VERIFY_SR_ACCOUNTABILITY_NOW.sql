-- Complete Verification: Find all payments + Verify SR Accountability calculation
-- Run this to see the full picture

-- Step 1: Find ALL payments (comprehensive search)
SELECT 
  p.id,
  p.amount,
  s.invoice_number,
  s.total_amount as sale_total,
  s.assigned_to as sale_sr_id,
  u_sale.name as sale_sr_name,
  p.collected_by as payment_collected_by,
  u_payment.name as payment_collected_by_name,
  s.route_id as sale_route_id,
  p.route_id as payment_route_id,
  r.route_number,
  p.created_at,
  CASE 
    WHEN p.amount = 20000 THEN '🔍 Amount = 20,000'
    WHEN p.amount = 400 THEN '🔍 Amount = 400'
    WHEN p.amount = 13000 THEN '🔍 Amount = 13,000'
    WHEN s.route_id IS NULL THEN '⚠️ Sale not in route'
    WHEN p.collected_by IS NULL THEN '❌ Missing collected_by'
    WHEN p.route_id IS NULL THEN '❌ Missing route_id'
    WHEN p.collected_by != s.assigned_to THEN '⚠️ collected_by mismatch'
    ELSE '✅ Correct'
  END as status
FROM payments p
JOIN sales s ON p.sale_id = s.id
LEFT JOIN users u_sale ON s.assigned_to = u_sale.id
LEFT JOIN users u_payment ON p.collected_by = u_payment.id
LEFT JOIN routes r ON s.route_id = r.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY p.created_at DESC;

-- Step 2: Summary by SR
SELECT 
  COALESCE(u_sale.name, 'No SR') as sale_sr_name,
  COUNT(*) as payment_count,
  SUM(p.amount) as total_amount,
  COUNT(CASE WHEN s.route_id IS NOT NULL THEN 1 END) as payments_in_routes,
  COUNT(CASE WHEN s.route_id IS NULL THEN 1 END) as payments_not_in_routes
FROM payments p
JOIN sales s ON p.sale_id = s.id
LEFT JOIN users u_sale ON s.assigned_to = u_sale.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY u_sale.name
ORDER BY total_amount DESC;

-- Step 3: Verify SR Accountability calculation for Jahid
-- This simulates what the backend should return
WITH jahid_routes AS (
  SELECT r.id as route_id, r.assigned_to as sr_id
  FROM routes r
  WHERE r.assigned_to = (
    SELECT id FROM users 
    WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
    LIMIT 1
  )
),
route_payments AS (
  SELECT 
    r.route_id,
    COUNT(DISTINCT p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_from_payments
  FROM jahid_routes r
  LEFT JOIN payments p ON p.route_id = r.route_id 
    AND p.collected_by = r.sr_id
  GROUP BY r.route_id
),
route_recons AS (
  SELECT 
    r.route_id,
    COALESCE(SUM(rr.total_collected_cash), 0) as total_from_recons,
    COALESCE(SUM(rr.total_returns_amount), 0) as total_returns
  FROM jahid_routes r
  LEFT JOIN route_reconciliations rr ON rr.route_id = r.route_id
  GROUP BY r.route_id
),
route_expected AS (
  SELECT 
    r.route_id,
    COALESCE(SUM(rs.previous_due + s.total_amount), 0) as total_expected
  FROM jahid_routes r
  LEFT JOIN route_sales rs ON rs.route_id = r.route_id
  LEFT JOIN sales s ON s.id = rs.sale_id
  GROUP BY r.route_id
)
SELECT 
  'SR Accountability Summary' as report_type,
  COUNT(DISTINCT r.route_id) as active_routes,
  SUM(e.total_expected) as total_expected_cash,
  SUM(p.total_from_payments) as total_collected_from_payments,
  SUM(CASE WHEN p.payment_count > 0 THEN 0 ELSE re.total_from_recons END) as total_collected_from_recons,
  SUM(p.total_from_payments + CASE WHEN p.payment_count > 0 THEN 0 ELSE re.total_from_recons END) as total_collected,
  SUM(re.total_returns) as total_returns,
  SUM(e.total_expected) - SUM(p.total_from_payments + CASE WHEN p.payment_count > 0 THEN 0 ELSE re.total_from_recons END) - SUM(re.total_returns) as current_outstanding
FROM jahid_routes r
LEFT JOIN route_payments p ON p.route_id = r.route_id
LEFT JOIN route_recons re ON re.route_id = r.route_id
LEFT JOIN route_expected e ON e.route_id = r.route_id
GROUP BY report_type;
