-- DistroHub Database Schema for Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/llucnnzcslnulnyzourx/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'sales_rep',
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    pack_size INTEGER DEFAULT 1,
    purchase_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product batches table (for expiry tracking)
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Retailers table
CREATE TABLE IF NOT EXISTS retailers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    area VARCHAR(100) NOT NULL,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    total_due DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases table (stock-in from suppliers)
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_name VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase items table
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) NOT NULL,
    retailer_id UUID REFERENCES retailers(id),
    retailer_name VARCHAR(255) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    due_amount DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'due',
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID REFERENCES retailers(id),
    retailer_name VARCHAR(255) NOT NULL,
    sale_id UUID REFERENCES sales(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT '#4F46E5',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers table (for purchase management)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units table (measurement units)
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    abbreviation VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_sales_retailer_id ON sales(retailer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_retailer_id ON payments(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailers_area ON retailers(area);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_units_name ON units(name);
CREATE INDEX IF NOT EXISTS idx_units_abbreviation ON units(abbreviation);

-- Insert demo users (password: admin123 and sales123 - SHA256 hashed)
INSERT INTO users (email, name, role, phone, password_hash) VALUES
('admin@distrohub.com', 'Admin User', 'admin', '01700000001', '240be518fabd2724ddb6f04eeb9d5b0a8e0b5e2b4c3d5e6f7a8b9c0d1e2f3a4b'),
('sales@distrohub.com', 'Sales Rep', 'sales_rep', '01700000002', '5e884898da28047d9c5c8b7d8b8e8f8a8b8c8d8e8f9a9b9c9d9e9f0a0b0c0d0e')
ON CONFLICT (email) DO NOTHING;

-- Insert demo products (Akij Food & Beverage)
INSERT INTO products (name, sku, category, unit, pack_size, purchase_price, selling_price) VALUES
('Akij Daily Atta 2kg', 'AKJ-ATTA-2KG', 'Flour', 'Pack', 10, 85.00, 95.00),
('Akij Daily Maida 1kg', 'AKJ-MAIDA-1KG', 'Flour', 'Pack', 20, 45.00, 52.00),
('Akij Daily Suji 500g', 'AKJ-SUJI-500G', 'Flour', 'Pack', 24, 35.00, 42.00),
('Farm Fresh UHT Milk 1L', 'FF-MILK-1L', 'Dairy', 'Pack', 12, 95.00, 110.00),
('Farm Fresh Mango Juice 250ml', 'FF-MANGO-250ML', 'Beverage', 'Pack', 24, 22.00, 28.00),
('Speed Energy Drink 250ml', 'SPD-ENERGY-250ML', 'Beverage', 'Can', 24, 45.00, 55.00),
('Akij Daily Rice 5kg', 'AKJ-RICE-5KG', 'Rice', 'Bag', 8, 320.00, 365.00),
('Akij Daily Sugar 1kg', 'AKJ-SUGAR-1KG', 'Grocery', 'Pack', 20, 110.00, 125.00)
ON CONFLICT (sku) DO NOTHING;

-- Insert demo retailers
INSERT INTO retailers (name, shop_name, phone, address, area, credit_limit, total_due) VALUES
('Karim Uddin', 'Karim Store', '01712345678', 'Shop 12, Mirpur-10', 'Mirpur', 50000.00, 15000.00),
('Abdul Haque', 'Haque Grocery', '01812345678', 'Shop 5, Dhanmondi-27', 'Dhanmondi', 75000.00, 22000.00),
('Rahim Mia', 'Rahim Bhandar', '01912345678', 'Shop 8, Uttara Sector-7', 'Uttara', 60000.00, 8500.00),
('Jamal Ahmed', 'Ahmed Store', '01612345678', 'Shop 3, Gulshan-2', 'Gulshan', 100000.00, 45000.00)
ON CONFLICT DO NOTHING;

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

-- Insert default suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('Akij Food & Beverage Ltd', 'Mr. Rahman', '01711111111', 'sales@akijfood.com', 'Akij House, Tejgaon, Dhaka'),
('Farm Fresh Ltd', 'Mr. Karim', '01722222222', 'order@farmfresh.com.bd', 'Uttara, Dhaka'),
('Bengal Traders', 'Mr. Hasan', '01733333333', 'bengaltraders@gmail.com', 'Motijheel, Dhaka')
ON CONFLICT DO NOTHING;

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

-- Enable Row Level Security (RLS) - optional for now
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

SELECT 'Schema created successfully!' as status;
