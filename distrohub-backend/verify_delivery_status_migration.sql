-- =====================================================
-- Delivery Status Migration Verification Script
-- =====================================================
-- Run this in Supabase SQL Editor to verify migration status
-- File: verify_delivery_status_migration.sql
-- =====================================================

-- Step 1: Check if columns exist
SELECT 
    'Column Existence Check' as test_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('delivery_status', 'delivered_at')
ORDER BY column_name;

-- Step 2: Count total sales records
SELECT 
    'Total Sales Records' as test_name,
    COUNT(*) as total_count
FROM sales;

-- Step 3: Check delivery_status distribution
SELECT 
    'Delivery Status Distribution' as test_name,
    COALESCE(delivery_status, 'NULL') as delivery_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM sales), 2) as percentage
FROM sales 
GROUP BY delivery_status
ORDER BY count DESC;

-- Step 4: Check for NULL values (should be 0)
SELECT 
    'NULL Check' as test_name,
    COUNT(*) as null_delivery_status_count
FROM sales 
WHERE delivery_status IS NULL;

-- Step 5: Check delivered_at usage
SELECT 
    'Delivered At Usage' as test_name,
    COUNT(*) as total_records,
    COUNT(delivered_at) as records_with_delivered_at,
    COUNT(*) - COUNT(delivered_at) as records_without_delivered_at
FROM sales;

-- Step 6: Sample data check (last 5 records)
SELECT 
    'Sample Data (Last 5)' as test_name,
    invoice_number,
    delivery_status,
    delivered_at,
    created_at
FROM sales 
ORDER BY created_at DESC 
LIMIT 5;

-- =====================================================
-- Migration Status Summary
-- =====================================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sales' 
            AND column_name = 'delivery_status'
        ) THEN '✅ delivery_status column EXISTS'
        ELSE '❌ delivery_status column MISSING'
    END as delivery_status_column_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sales' 
            AND column_name = 'delivered_at'
        ) THEN '✅ delivered_at column EXISTS'
        ELSE '❌ delivered_at column MISSING'
    END as delivered_at_column_status,
    
    CASE 
        WHEN (
            SELECT COUNT(*) FROM sales WHERE delivery_status IS NULL
        ) = 0 THEN '✅ No NULL delivery_status values'
        ELSE '⚠️ Some NULL delivery_status values found'
    END as data_consistency_status;

-- =====================================================
-- If migration needed, run this:
-- =====================================================
/*
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

UPDATE sales 
SET delivery_status = 'pending' 
WHERE delivery_status IS NULL;
*/
