-- Create warehouse_stock summary table
-- Provides quick lookup of total stock per product per warehouse
-- Updated automatically when batches are created/updated/deleted

-- Warehouse stock summary table for quick lookups
CREATE TABLE IF NOT EXISTS warehouse_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    total_quantity INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(warehouse_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse_id 
ON warehouse_stock(warehouse_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product_id 
ON warehouse_stock(product_id);

-- Add comments
COMMENT ON TABLE warehouse_stock IS 'Summary table for quick lookup of total stock per product per warehouse. Automatically maintained from product_batches.';
COMMENT ON COLUMN warehouse_stock.total_quantity IS 'Total quantity of this product in this warehouse (sum of all batches)';

-- Populate warehouse_stock from existing product_batches
-- This initializes the summary table with current data
INSERT INTO warehouse_stock (warehouse_id, product_id, total_quantity)
SELECT 
    pb.warehouse_id,
    pb.product_id,
    SUM(pb.quantity) as total_quantity
FROM product_batches pb
WHERE pb.warehouse_id IS NOT NULL
GROUP BY pb.warehouse_id, pb.product_id
ON CONFLICT (warehouse_id, product_id) 
DO UPDATE SET 
    total_quantity = EXCLUDED.total_quantity,
    last_updated = NOW();

