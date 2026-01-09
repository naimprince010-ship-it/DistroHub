-- Combined Migration: Accountability Feature
-- Run this file to add all accountability tracking columns at once
-- Created: 2026-01-10

-- ============================================
-- 1. Add Assigned To Fields to Sales Table
-- ============================================
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_sales_assigned_to ON sales(assigned_to);

COMMENT ON COLUMN sales.assigned_to IS 'User ID of the SR/delivery man assigned to collect payment for this invoice';
COMMENT ON COLUMN sales.assigned_to_name IS 'Name of the assigned SR/delivery man (denormalized for performance)';

-- ============================================
-- 2. Add Collected By Fields to Payments Table
-- ============================================
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS collected_by_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_payments_collected_by ON payments(collected_by);

COMMENT ON COLUMN payments.collected_by IS 'User ID of the SR/delivery man who collected this payment';
COMMENT ON COLUMN payments.collected_by_name IS 'Name of the SR/delivery man who collected this payment (denormalized for performance)';

-- Verification query (optional - run to check)
SELECT 
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'assigned_to') as sales_assigned_to_added,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'collected_by') as payments_collected_by_added;
