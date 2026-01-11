-- ============================================
-- ONE-TIME BACKFILL: Update payments.route_id from sales.route_id
-- ============================================
-- Purpose: Fix historical payments created before route_id was added
-- Created: 2026-01-13
-- 
-- IMPORTANT: This is a ONE-TIME data fix for historical payments.
-- New payments created after 2026-01-13 already have route_id set correctly
-- via create_payment() function in supabase_db.py
--
-- Safety: Only updates payments where:
--   - payments.route_id IS NULL (not already set)
--   - sales.route_id IS NOT NULL (sale is in a route)
--   This ensures we don't overwrite existing data or set invalid route_id

-- Step 1: Preview affected rows (run this first to see what will be updated)
-- ============================================
SELECT 
    COUNT(*) as payments_to_update,
    COUNT(DISTINCT p.sale_id) as unique_sales,
    COUNT(DISTINCT s.route_id) as unique_routes,
    SUM(p.amount) as total_amount_to_fix
FROM payments p
JOIN sales s ON p.sale_id = s.id
WHERE p.route_id IS NULL
AND s.route_id IS NOT NULL;

-- Step 2: Perform backfill (uncomment to run)
-- ============================================
-- UPDATE payments p
-- SET route_id = s.route_id
-- FROM sales s
-- WHERE p.sale_id = s.id
-- AND p.route_id IS NULL
-- AND s.route_id IS NOT NULL;

-- Step 3: Verify backfill (run after Step 2)
-- ============================================
SELECT 
    COUNT(*) as payments_updated,
    COUNT(DISTINCT route_id) as unique_routes_linked,
    MIN(created_at) as oldest_payment_updated,
    MAX(created_at) as newest_payment_updated
FROM payments
WHERE route_id IS NOT NULL;

-- Expected Result:
-- - payments_updated: Should match Step 1 count
-- - unique_routes_linked: Number of routes that now have payments linked
-- - All payments for sales in routes should now have route_id set
