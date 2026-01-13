-- Fix payment for Route 1 (RT-20260112-B4B3)
-- This route has 1 sale but 0 payments showing up

-- Step 1: Check what sale is in Route 1
SELECT 
  rs.route_id,
  r.route_number,
  rs.sale_id,
  s.invoice_number,
  s.total_amount,
  s.assigned_to as sale_assigned_to,
  u.name as sale_assigned_to_name,
  s.route_id as sale_route_id,
  COUNT(p.id) as payment_count,
  COALESCE(SUM(p.amount), 0) as total_payments
FROM route_sales rs
JOIN routes r ON rs.route_id = r.id
JOIN sales s ON rs.sale_id = s.id
LEFT JOIN users u ON s.assigned_to = u.id
LEFT JOIN payments p ON p.sale_id = s.id
WHERE r.route_number = 'RT-20260112-B4B3'
GROUP BY rs.route_id, r.route_number, rs.sale_id, s.invoice_number, s.total_amount, s.assigned_to, u.name, s.route_id;

-- Step 2: Check ALL payments for the sale in Route 1
SELECT 
  p.id as payment_id,
  p.amount,
  p.collected_by,
  u_payment.name as collected_by_name,
  p.route_id as payment_route_id,
  s.route_id as sale_route_id,
  r.route_number,
  s.invoice_number,
  p.created_at,
  CASE 
    WHEN p.route_id IS NULL THEN '❌ Payment route_id is NULL'
    WHEN p.collected_by != r.assigned_to THEN '❌ collected_by mismatch'
    WHEN p.route_id != s.route_id THEN '❌ route_id mismatch'
    ELSE '✅ Correct'
  END as status
FROM route_sales rs
JOIN routes r ON rs.route_id = r.id
JOIN sales s ON rs.sale_id = s.id
LEFT JOIN payments p ON p.sale_id = s.id
LEFT JOIN users u_payment ON p.collected_by = u_payment.id
WHERE r.route_number = 'RT-20260112-B4B3'
ORDER BY p.created_at DESC;

-- Step 3: Fix payment for Route 1 (if payment exists but route_id/collected_by is wrong)
BEGIN;

-- Fix route_id for payments in Route 1
UPDATE payments p
SET route_id = s.route_id
FROM sales s
JOIN route_sales rs ON rs.sale_id = s.id
JOIN routes r ON rs.route_id = r.id
WHERE p.sale_id = s.id
  AND r.route_number = 'RT-20260112-B4B3'
  AND (p.route_id IS NULL OR p.route_id != s.route_id);

-- Fix collected_by for payments in Route 1
UPDATE payments p
SET collected_by = r.assigned_to
FROM sales s
JOIN route_sales rs ON rs.sale_id = s.id
JOIN routes r ON rs.route_id = r.id
WHERE p.sale_id = s.id
  AND r.route_number = 'RT-20260112-B4B3'
  AND (p.collected_by IS NULL OR p.collected_by != r.assigned_to);

-- Verify fix
SELECT 
  r.route_number,
  COUNT(DISTINCT p.id) as payment_count,
  COALESCE(SUM(p.amount), 0) as total_payments
FROM routes r
JOIN route_sales rs ON rs.route_id = r.id
JOIN sales s ON rs.sale_id = s.id
LEFT JOIN payments p ON p.sale_id = s.id AND p.collected_by = r.assigned_to AND p.route_id = r.id
WHERE r.route_number = 'RT-20260112-B4B3'
GROUP BY r.route_number;

COMMIT;
