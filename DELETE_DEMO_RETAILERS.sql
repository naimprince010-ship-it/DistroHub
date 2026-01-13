-- =====================================================
-- DELETE DEMO RETAILERS FROM RECEIVABLES
-- =====================================================
-- This script removes demo/test retailers that were inserted during initial setup
-- Run this in Supabase SQL Editor or your PostgreSQL client
--
-- Demo retailers from schema.sql:
-- - Karim Uddin - Karim Store - 01712345678
-- - Abdul Haque - Haque Grocery - 01812345678
-- - Rahim Mia - Rahim Bhandar - 01912345678
-- - Jamal Ahmed - Ahmed Store - 01612345678
-- =====================================================

-- Step 1: Check which demo retailers exist (RUN THIS FIRST TO VERIFY)
SELECT 
    id,
    name,
    shop_name,
    phone,
    total_due,
    created_at
FROM retailers
WHERE 
    name IN ('Karim Uddin', 'Abdul Haque', 'Rahim Mia', 'Jamal Ahmed')
    OR shop_name IN ('Karim Store', 'Haque Grocery', 'Rahim Bhandar', 'Ahmed Store')
    OR phone IN ('01712345678', '01812345678', '01912345678', '01612345678')
ORDER BY created_at;

-- Step 3: Delete related data first (to avoid foreign key constraints)

-- Delete payments for demo retailers
DELETE FROM payments
WHERE retailer_id IN (
    SELECT id FROM retailers
    WHERE 
        name IN ('Karim Uddin', 'Abdul Haque', 'Rahim Mia', 'Jamal Ahmed')
        OR shop_name IN ('Karim Store', 'Haque Grocery', 'Rahim Bhandar', 'Ahmed Store')
        OR phone IN ('01712345678', '01812345678', '01912345678', '01612345678')
);

-- Delete sales for demo retailers
DELETE FROM sales
WHERE retailer_id IN (
    SELECT id FROM retailers
    WHERE 
        name IN ('Karim Uddin', 'Abdul Haque', 'Rahim Mia', 'Jamal Ahmed')
        OR shop_name IN ('Karim Store', 'Haque Grocery', 'Rahim Bhandar', 'Ahmed Store')
        OR phone IN ('01712345678', '01812345678', '01912345678', '01612345678')
);

-- Delete route_sales entries for sales that were deleted
DELETE FROM route_sales
WHERE sale_id NOT IN (SELECT id FROM sales);

-- Step 4: Delete demo retailers
DELETE FROM retailers
WHERE 
    name IN ('Karim Uddin', 'Abdul Haque', 'Rahim Mia', 'Jamal Ahmed')
    OR shop_name IN ('Karim Store', 'Haque Grocery', 'Rahim Bhandar', 'Ahmed Store')
    OR phone IN ('01712345678', '01812345678', '01912345678', '01612345678');

-- Step 5: Verify deletion
SELECT 
    COUNT(*) as remaining_demo_retailers
FROM retailers
WHERE 
    name IN ('Karim Uddin', 'Abdul Haque', 'Rahim Mia', 'Jamal Ahmed')
    OR shop_name IN ('Karim Store', 'Haque Grocery', 'Rahim Bhandar', 'Ahmed Store')
    OR phone IN ('01712345678', '01812345678', '01912345678', '01612345678');

-- Expected result: remaining_demo_retailers = 0

-- Step 6: Show remaining retailers (for verification)
SELECT 
    id,
    name,
    shop_name,
    phone,
    total_due,
    created_at
FROM retailers
ORDER BY created_at DESC
LIMIT 10;
