-- Performance indexes for dashboard and report queries
-- Safe to run multiple times

-- Purchases list and items lookup
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);

-- Sales list and items lookup
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

-- Receivables and monthly collections
CREATE INDEX IF NOT EXISTS idx_retailers_total_due ON retailers(total_due);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
