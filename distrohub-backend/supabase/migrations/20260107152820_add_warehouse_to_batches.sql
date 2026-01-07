-- Add warehouse_id to product_batches table
-- Links each batch to a specific warehouse for warehouse-specific stock tracking

-- Add warehouse_id column to product_batches
ALTER TABLE product_batches 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_batches_warehouse_id 
ON product_batches(warehouse_id);

-- Migrate existing batches to default warehouse (Main Warehouse)
-- This ensures all existing stock is assigned to a warehouse
UPDATE product_batches 
SET warehouse_id = (SELECT id FROM warehouses WHERE name = 'Main Warehouse' LIMIT 1)
WHERE warehouse_id IS NULL;

-- Add comment
COMMENT ON COLUMN product_batches.warehouse_id IS 'Warehouse where this batch is stored. Required for warehouse-specific stock tracking.';

