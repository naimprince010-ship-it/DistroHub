-- =====================================================
-- SALES RETURNS MIGRATION - COPY THIS TO SUPABASE
-- =====================================================
-- 
-- Instructions:
-- 1. Go to: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to: SQL Editor → New Query
-- 4. Copy ALL code below (from line 7 to end)
-- 5. Paste into SQL Editor
-- 6. Click "Run" button
-- 7. You should see: "Success. No rows returned"
--
-- =====================================================

-- Sales Returns table
CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(100) NOT NULL UNIQUE,
    sale_id UUID REFERENCES sales(id) NOT NULL,
    retailer_id UUID REFERENCES retailers(id) NOT NULL,
    retailer_name VARCHAR(255) NOT NULL,
    total_return_amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    refund_type VARCHAR(50) DEFAULT 'adjust_due',
    status VARCHAR(50) DEFAULT 'completed',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Return Items table
CREATE TABLE IF NOT EXISTS sales_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES sale_items(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    batch_id UUID REFERENCES product_batches(id),
    quantity_returned INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total_returned DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_returns_sale_id ON sales_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_retailer_id ON sales_returns(retailer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_return_number ON sales_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_return_id ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_sale_item_id ON sales_return_items(sale_item_id);

-- Add comments
COMMENT ON TABLE sales_returns IS 'Records for sales returns/credit notes. Original sales remain immutable for audit.';
COMMENT ON TABLE sales_return_items IS 'Individual items returned from a sale. Links to original sale_items.';

-- =====================================================
-- DONE! Tables created successfully.
-- =====================================================

