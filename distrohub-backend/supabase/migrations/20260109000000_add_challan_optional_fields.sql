-- Optional Migration: Add Challan UI Optional Fields
-- Created: 2026-01-09
-- Description: Adds optional fields for enhanced Challan UI (bonus_qty, challan_type, distribution info)
-- Note: This migration is OPTIONAL - Challan UI works without these fields

-- Add bonus_qty to sale_items table (for tracking bonus quantities)
ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS bonus_qty INTEGER DEFAULT 0;

-- Add challan_type to sales table (Normal/Return)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS challan_type VARCHAR(20) DEFAULT 'Normal';

-- Add distribution information to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS distributor_name VARCHAR(255);
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS route_name VARCHAR(255);
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS route_code VARCHAR(100);
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS sr_name VARCHAR(255);
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS sr_id VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN sale_items.bonus_qty IS 'Bonus quantity given to retailer (optional)';
COMMENT ON COLUMN sales.challan_type IS 'Challan type: Normal or Return (default: Normal)';
COMMENT ON COLUMN sales.distributor_name IS 'Distributor name for this sale (optional)';
COMMENT ON COLUMN sales.route_name IS 'Route name for delivery (optional)';
COMMENT ON COLUMN sales.route_code IS 'Route code (optional)';
COMMENT ON COLUMN sales.sr_name IS 'Sales Representative name (optional)';
COMMENT ON COLUMN sales.sr_id IS 'Sales Representative ID (optional)';

-- Update existing sales records with default challan_type
UPDATE sales 
SET challan_type = 'Normal' 
WHERE challan_type IS NULL;

-- Verification query (optional - run to check)
-- SELECT 
--     'Migration completed successfully' as status,
--     (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'bonus_qty') as bonus_qty_added,
--     (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'challan_type') as challan_type_added;
