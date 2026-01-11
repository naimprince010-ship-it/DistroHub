-- ============================================
-- Payment Route ID - Quick Verification Queries
-- ============================================
-- Run these queries in Supabase SQL Editor after migration

-- 1. Verify Migration Applied
-- ============================================
SELECT 
    'Migration Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'route_id'
        ) THEN '✅ route_id column exists'
        ELSE '❌ route_id column missing'
    END as status;

-- 2. Check Recent Payments - route_id Population
-- ============================================
SELECT 
    p.id,
    p.sale_id,
    p.route_id as payment_route_id,
    s.route_id as sale_route_id,
    p.amount,
    p.collected_by,
    CASE 
        WHEN p.route_id = s.route_id THEN '✅ Match'
        WHEN p.route_id IS NULL AND s.route_id IS NULL THEN '✅ Both NULL (sale not in route)'
        WHEN p.route_id IS NULL AND s.route_id IS NOT NULL THEN '❌ Payment missing route_id'
        ELSE '❌ Mismatch'
    END as verification
FROM payments p
JOIN sales s ON p.sale_id = s.id
ORDER BY p.created_at DESC
LIMIT 20;

-- 3. Verify SR Accountability - Payments by Route
-- ============================================
SELECT 
    r.id as route_id,
    r.route_number,
    r.assigned_to_name as route_sr,
    COUNT(DISTINCT p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_payments,
    COUNT(DISTINCT CASE WHEN p.route_id IS NOT NULL THEN p.id END) as payments_with_route_id,
    COUNT(DISTINCT CASE WHEN p.route_id IS NULL THEN p.id END) as payments_without_route_id
FROM routes r
LEFT JOIN payments p ON p.route_id = r.id AND p.collected_by = r.assigned_to
WHERE r.assigned_to = '<SR_USER_ID>'  -- Replace with actual SR user ID
GROUP BY r.id, r.route_number, r.assigned_to_name
ORDER BY r.created_at DESC;

-- 4. Double-Count Safeguard Check
-- ============================================
SELECT 
    r.id as route_id,
    r.route_number,
    COUNT(DISTINCT p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_payments,
    COUNT(DISTINCT rr.id) as reconciliation_count,
    COALESCE(SUM(rr.total_collected_cash), 0) as total_reconciliation,
    CASE 
        WHEN COUNT(DISTINCT p.id) > 0 AND COUNT(DISTINCT rr.id) > 0 
        THEN '⚠️ Has BOTH - safeguard should exclude reconciliation'
        WHEN COUNT(DISTINCT p.id) > 0 
        THEN '✅ Payments only - use payments'
        WHEN COUNT(DISTINCT rr.id) > 0 
        THEN '✅ Reconciliation only - use reconciliation'
        ELSE 'ℹ️ Neither'
    END as safeguard_status
FROM routes r
LEFT JOIN payments p ON p.route_id = r.id AND p.collected_by = r.assigned_to
LEFT JOIN route_reconciliations rr ON rr.route_id = r.id
WHERE r.assigned_to = '<SR_USER_ID>'  -- Replace with actual SR user ID
GROUP BY r.id, r.route_number
HAVING COUNT(DISTINCT p.id) > 0 OR COUNT(DISTINCT rr.id) > 0
ORDER BY r.created_at DESC;

-- 5. Find Payments Missing route_id (Needs Backfill)
-- ============================================
SELECT 
    p.id,
    p.sale_id,
    p.route_id as payment_route_id,
    s.route_id as sale_route_id,
    p.created_at as payment_created_at,
    '⚠️ Needs backfill' as status
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE s.route_id IS NOT NULL
AND p.route_id IS NULL
ORDER BY p.created_at DESC;

-- 6. Backfill Query (Run only if Query 5 finds rows)
-- ============================================
-- UPDATE payments p
-- SET route_id = s.route_id
-- FROM sales s
-- WHERE p.sale_id = s.id
-- AND s.route_id IS NOT NULL
-- AND p.route_id IS NULL;

-- 7. Summary Statistics
-- ============================================
SELECT 
    'Payment Statistics' as metric,
    COUNT(*) as total_payments,
    COUNT(DISTINCT route_id) as payments_with_route_id,
    COUNT(*) - COUNT(route_id) as payments_without_route_id,
    ROUND(100.0 * COUNT(route_id) / COUNT(*), 2) as percent_with_route_id
FROM payments;
