-- ============================================
-- Backfill Verification Queries
-- ============================================
-- Run these queries AFTER backfill to verify data consistency

-- 1. Before/After Comparison
-- ============================================
-- BEFORE BACKFILL: Count payments missing route_id
SELECT 
    'Before Backfill' as status,
    COUNT(*) as payments_missing_route_id,
    COUNT(DISTINCT s.route_id) as routes_affected,
    SUM(p.amount) as total_amount_affected
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NULL
AND s.route_id IS NOT NULL;

-- AFTER BACKFILL: Should return 0 rows
SELECT 
    'After Backfill' as status,
    COUNT(*) as payments_missing_route_id,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All payments fixed'
        ELSE '❌ Some payments still missing route_id'
    END as verification
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NULL
AND s.route_id IS NOT NULL;

-- 2. Route-wise Payment Summary (SR Accountability Verification)
-- ============================================
SELECT 
    r.id as route_id,
    r.route_number,
    r.assigned_to_name as route_sr,
    r.status as route_status,
    COUNT(DISTINCT p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_collected,
    COUNT(DISTINCT CASE WHEN p.route_id IS NOT NULL THEN p.id END) as payments_with_route_id,
    COUNT(DISTINCT CASE WHEN p.route_id IS NULL THEN p.id END) as payments_without_route_id,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN p.route_id IS NULL THEN p.id END) = 0 
        THEN '✅ All payments linked'
        ELSE '⚠️ Some payments missing route_id'
    END as verification_status
FROM routes r
LEFT JOIN payments p ON p.route_id = r.id AND p.collected_by = r.assigned_to
WHERE r.assigned_to = '<SR_USER_ID>'  -- Replace with actual SR user ID
GROUP BY r.id, r.route_number, r.assigned_to_name, r.status
ORDER BY r.created_at DESC;

-- 3. Overall Statistics
-- ============================================
SELECT 
    'Payment Statistics' as metric,
    COUNT(*) as total_payments,
    COUNT(route_id) as payments_with_route_id,
    COUNT(*) - COUNT(route_id) as payments_without_route_id,
    ROUND(100.0 * COUNT(route_id) / NULLIF(COUNT(*), 0), 2) as percent_with_route_id,
    CASE 
        WHEN COUNT(*) - COUNT(route_id) = 0 THEN '✅ All payments have route_id (or sale not in route)'
        ELSE '⚠️ Some payments missing route_id'
    END as overall_status
FROM payments;

-- 4. Data Consistency Check
-- ============================================
SELECT 
    'Data Consistency' as check_type,
    COUNT(*) as total_payments,
    COUNT(CASE WHEN p.route_id = s.route_id THEN 1 END) as matching_route_ids,
    COUNT(CASE WHEN p.route_id IS NULL AND s.route_id IS NULL THEN 1 END) as both_null_correct,
    COUNT(CASE WHEN p.route_id IS NULL AND s.route_id IS NOT NULL THEN 1 END) as payment_missing_route_id,
    COUNT(CASE WHEN p.route_id IS NOT NULL AND s.route_id IS NULL THEN 1 END) as payment_has_route_id_but_sale_not_in_route,
    CASE 
        WHEN COUNT(CASE WHEN p.route_id IS NULL AND s.route_id IS NOT NULL THEN 1 END) = 0 
        THEN '✅ All payments correctly linked'
        ELSE '❌ Some payments need backfill'
    END as consistency_status
FROM payments p
JOIN sales s ON p.sale_id = s.id;

-- 5. SR Accountability Impact (Before vs After)
-- ============================================
-- This shows how backfill affects SR Accountability totals
SELECT 
    r.assigned_to_name as sr_name,
    COUNT(DISTINCT r.id) as route_count,
    COUNT(DISTINCT p.id) as payment_count,
    COALESCE(SUM(p.amount), 0) as total_collected,
    COUNT(DISTINCT CASE WHEN p.route_id IS NOT NULL THEN p.id END) as payments_counted_in_accountability,
    COALESCE(SUM(CASE WHEN p.route_id IS NOT NULL THEN p.amount ELSE 0 END), 0) as amount_counted_in_accountability,
    CASE 
        WHEN COUNT(DISTINCT p.id) = COUNT(DISTINCT CASE WHEN p.route_id IS NOT NULL THEN p.id END)
        THEN '✅ All payments will appear in SR Accountability'
        ELSE '⚠️ Some payments missing from SR Accountability'
    END as accountability_status
FROM routes r
LEFT JOIN payments p ON p.route_id = r.id AND p.collected_by = r.assigned_to
GROUP BY r.assigned_to_name
ORDER BY total_collected DESC;
