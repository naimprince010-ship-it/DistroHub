-- Comprehensive search: Find ALL payments (regardless of assignment or route)
-- This will help identify if the missing payment exists elsewhere

-- Step 1: Find ALL payments created today (or recent)
SELECT 
  p.id,
  p.amount,
  p.collected_by,
  u.name as collected_by_name,
  p.route_id,
  s.route_id as sale_route_id,
  s.assigned_to as sale_assigned_to,
  u2.name as sale_assigned_to_name,
  s.invoice_number,
  s.total_amount as sale_total,
  p.created_at,
  CASE 
    WHEN s.route_id IS NULL THEN '⚠️ Sale not in route'
    WHEN p.collected_by IS NULL THEN '❌ Missing collected_by'
    WHEN p.route_id IS NULL THEN '❌ Missing route_id'
    WHEN p.collected_by != s.assigned_to THEN '⚠️ collected_by mismatch'
    WHEN p.amount = 20000 THEN '🔍 Amount matches 20,000'
    WHEN p.amount = 400 THEN '🔍 Amount matches 400'
    ELSE '✅ Correct'
  END as status
FROM payments p
JOIN sales s ON p.sale_id = s.id
LEFT JOIN users u ON p.collected_by = u.id
LEFT JOIN users u2 ON s.assigned_to = u2.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'  -- Last 7 days
ORDER BY p.created_at DESC;

-- Step 2: Summary by amount (to find the 20,000 and 400 payments)
SELECT 
  p.amount,
  COUNT(*) as payment_count,
  STRING_AGG(DISTINCT s.invoice_number, ', ') as invoice_numbers,
  STRING_AGG(DISTINCT u2.name, ', ') as assigned_srs,
  SUM(p.amount) as total_for_this_amount
FROM payments p
JOIN sales s ON p.sale_id = s.id
LEFT JOIN users u2 ON s.assigned_to = u2.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.amount
ORDER BY p.amount DESC;

-- Step 3: Check payments for specific invoice numbers (if you remember them)
-- Replace 'INV-20260111-XXXX' with actual invoice numbers
SELECT 
  p.id,
  p.amount,
  s.invoice_number,
  s.total_amount,
  s.assigned_to,
  u.name as assigned_sr_name,
  s.route_id,
  p.collected_by,
  u2.name as collected_by_name,
  p.route_id as payment_route_id
FROM payments p
JOIN sales s ON p.sale_id = s.id
LEFT JOIN users u ON s.assigned_to = u.id
LEFT JOIN users u2 ON p.collected_by = u2.id
WHERE s.invoice_number LIKE 'INV-20260111-%'
ORDER BY s.invoice_number, p.created_at DESC;
