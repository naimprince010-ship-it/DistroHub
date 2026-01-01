-- Migration: Add Categories, Suppliers, and Units tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/llucnnzcslnulnyzourx/sql
-- Date: 2026-01-01

-- =====================================================
-- Categories Table
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT '#4F46E5',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Insert default categories
INSERT INTO categories (name, description, color) VALUES
    ('Flour', 'All types of flour products', '#EF4444'),
    ('Dairy', 'Milk, butter, cheese products', '#F59E0B'),
    ('Beverages', 'Soft drinks, juices, water', '#10B981'),
    ('Snacks', 'Chips, biscuits, cookies', '#6366F1'),
    ('Oil', 'Cooking oils and ghee', '#8B5CF6'),
    ('Rice', 'All varieties of rice', '#EC4899'),
    ('Spices', 'Spices and seasonings', '#F97316'),
    ('Grocery', 'General grocery items', '#14B8A6')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Suppliers Table
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);

-- Insert default suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
    ('Akij Food & Beverage Ltd', 'Mr. Rahman', '01711111111', 'sales@akijfood.com', 'Akij House, Tejgaon, Dhaka'),
    ('Farm Fresh Ltd', 'Mr. Karim', '01722222222', 'order@farmfresh.com.bd', 'Uttara, Dhaka'),
    ('Bengal Traders', 'Mr. Hasan', '01733333333', 'bengaltraders@gmail.com', 'Motijheel, Dhaka')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Units Table
-- =====================================================
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    abbreviation VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_units_name ON units(name);
CREATE INDEX IF NOT EXISTS idx_units_abbreviation ON units(abbreviation);

-- Insert default units
INSERT INTO units (name, abbreviation, description) VALUES
    ('Piece', 'pcs', 'Individual items'),
    ('Pack', 'pack', 'Packaged items'),
    ('Kilogram', 'kg', 'Weight in kilograms'),
    ('Gram', 'g', 'Weight in grams'),
    ('Liter', 'L', 'Volume in liters'),
    ('Milliliter', 'ml', 'Volume in milliliters'),
    ('Box', 'box', 'Boxed items'),
    ('Carton', 'ctn', 'Carton packaging'),
    ('Bag', 'bag', 'Bagged items'),
    ('Can', 'can', 'Canned items'),
    ('Bottle', 'btl', 'Bottled items'),
    ('Dozen', 'dz', '12 pieces')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Update products table to reference categories
-- =====================================================
-- Note: The products table already has a 'category' VARCHAR column
-- If you want to use foreign key reference, run this:
-- ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id);
-- Then migrate existing data and drop the old category column

-- =====================================================
-- Verify tables created
-- =====================================================
SELECT 'Categories table' as table_name, COUNT(*) as row_count FROM categories
UNION ALL
SELECT 'Suppliers table', COUNT(*) FROM suppliers
UNION ALL
SELECT 'Units table', COUNT(*) FROM units;

SELECT 'Migration 001 completed successfully!' as status;
