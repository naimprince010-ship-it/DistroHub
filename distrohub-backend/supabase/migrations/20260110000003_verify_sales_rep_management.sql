-- Verification Query: Check if Sales Rep Management fields exist
-- Run this FIRST to check if migration is needed
-- Created: 2026-01-10

-- Check if sales.assigned_to column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sales' 
            AND column_name = 'assigned_to'
        ) THEN '✓ sales.assigned_to exists'
        ELSE '✗ sales.assigned_to MISSING - Run migration 20260110000002'
    END as sales_assigned_to_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sales' 
            AND column_name = 'assigned_to_name'
        ) THEN '✓ sales.assigned_to_name exists'
        ELSE '✗ sales.assigned_to_name MISSING - Run migration 20260110000002'
    END as sales_assigned_to_name_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'payments' 
            AND column_name = 'collected_by'
        ) THEN '✓ payments.collected_by exists'
        ELSE '✗ payments.collected_by MISSING - Run migration 20260110000002'
    END as payments_collected_by_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'payments' 
            AND column_name = 'collected_by_name'
        ) THEN '✓ payments.collected_by_name exists'
        ELSE '✗ payments.collected_by_name MISSING - Run migration 20260110000002'
    END as payments_collected_by_name_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'phone'
        ) THEN '✓ users.phone exists'
        ELSE '✗ users.phone MISSING - Run initial schema migration'
    END as users_phone_status;
