-- Migration: Add Collected By Fields to Payments Table
-- Created: 2026-01-10
-- Description: Adds accountability tracking by adding collected_by and collected_by_name columns to payments table
-- This allows tracking which SR/delivery man actually collected each payment

-- Add collected_by column (references users.id)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add collected_by_name column for denormalized name storage (for faster queries)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS collected_by_name VARCHAR(255);

-- Add index for filtering by collected_by
CREATE INDEX IF NOT EXISTS idx_payments_collected_by ON payments(collected_by);

-- Add comments for documentation
COMMENT ON COLUMN payments.collected_by IS 'User ID of the SR/delivery man who collected this payment';
COMMENT ON COLUMN payments.collected_by_name IS 'Name of the SR/delivery man who collected this payment (denormalized for performance)';

-- Note: Existing payments will have collected_by = NULL (backward compatible)
-- New payments should always include collected_by when created
