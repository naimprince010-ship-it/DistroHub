-- Check for remaining payments that need fixing
-- Run this after the auto-fix to see if there are more payments

-- Step 1: Check ALL payments for Jahid's routes (not filtered by collected_by)
SELECT 
  p.id,
  p.amount,
  p.collected_by,
  p.route_id as payment_route_id,
  s.route_id as sale_route_id,
  s.assigned_to as sale_assigned_to,
  s.invoice_number,
  CASE 
    WHEN p.collected_by IS NULL THEN '❌ Missing collected_by'
    WHEN p.collected_by != s.assigned_to THEN '⚠️ collected_by mismatch'
    WHEN p.route_id IS NULL THEN '❌ Missing route_id'
    WHEN p.route_id != s.route_id THEN '⚠️ route_id mismatch'
    ELSE '✅ Correct'
  END as status
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
AND s.route_id IS NOT NULL
ORDER BY p.created_at DESC;

-- Step 2: Summary
SELECT 
  COUNT(*) as total_payments,
  COUNT(p.collected_by) as with_collected_by,
  COUNT(p.route_id) as with_route_id,
  SUM(p.amount) as total_amount,
  COUNT(CASE WHEN p.collected_by IS NULL THEN 1 END) as missing_collected_by,
  COUNT(CASE WHEN p.route_id IS NULL THEN 1 END) as missing_route_id
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.assigned_to = (
  SELECT id FROM users 
  WHERE name LIKE '%Jahid%' AND role = 'sales_rep' 
  LIMIT 1
)
AND s.route_id IS NOT NULL;
