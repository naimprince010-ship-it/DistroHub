-- Add test category and product
-- Created: 2026-01-01
-- Description: Add test category and a test product

-- Insert test category
INSERT INTO categories (name, description, color) VALUES
('test', 'Test category for testing purposes', '#9333EA')
ON CONFLICT (name) DO NOTHING;

-- Insert test product (belonging to test category)
INSERT INTO products (name, sku, category, unit, pack_size, purchase_price, selling_price, stock_quantity, reorder_level) VALUES
('Test Product', 'TEST-PRD-001', 'test', 'Pack', 12, 100.00, 120.00, 50, 10)
ON CONFLICT (sku) DO NOTHING;

SELECT 'Test category and product added successfully!' as status;

