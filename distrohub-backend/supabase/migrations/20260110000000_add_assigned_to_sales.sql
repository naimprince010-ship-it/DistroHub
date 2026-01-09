-- Migration: Add Assigned To Fields to Sales Table
-- Created: 2026-01-10
-- Description: Adds accountability tracking by adding assigned_to and assigned_to_name columns to sales table
-- This allows tracking which SR/delivery man is responsible for collecting payment for each invoice

-- Add assigned_to column (references users.id)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add assigned_to_name column for denormalized name storage (for faster queries)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);

-- Add index for filtering by assigned_to
CREATE INDEX IF NOT EXISTS idx_sales_assigned_to ON sales(assigned_to);

-- Add comments for documentation
COMMENT ON COLUMN sales.assigned_to IS 'User ID of the SR/delivery man assigned to collect payment for this invoice';
COMMENT ON COLUMN sales.assigned_to_name IS 'Name of the assigned SR/delivery man (denormalized for performance)';

-- Note: Existing sales will have assigned_to = NULL (backward compatible)
-- Admin can manually assign existing sales via edit functionality
