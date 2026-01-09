-- Route Batch System Migration
-- Creates tables for route/batch management, reconciliation, and SR accountability
-- Created: 2026-01-11

-- ============================================
-- 1. Routes Table
-- ============================================
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_number VARCHAR(100) UNIQUE NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    assigned_to_name VARCHAR(255) NOT NULL,
    route_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, completed, reconciled
    total_orders INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    reconciled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_routes_assigned_to ON routes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_routes_route_date ON routes(route_date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_route_number ON routes(route_number);

COMMENT ON TABLE routes IS 'Routes/batches grouping multiple sales orders for an SR/delivery man';
COMMENT ON COLUMN routes.status IS 'pending: created but not started, in_progress: SR is on route, completed: route finished, reconciled: end-of-day reconciliation done';

-- ============================================
-- 2. Route Sales Junction Table
-- ============================================
CREATE TABLE IF NOT EXISTS route_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    previous_due DECIMAL(10,2) DEFAULT 0,  -- Snapshot at batch creation time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(route_id, sale_id)
);

CREATE INDEX IF NOT EXISTS idx_route_sales_route_id ON route_sales(route_id);
CREATE INDEX IF NOT EXISTS idx_route_sales_sale_id ON route_sales(sale_id);

COMMENT ON TABLE route_sales IS 'Many-to-many relationship between routes and sales orders';
COMMENT ON COLUMN route_sales.previous_due IS 'Snapshot of retailer previous due amount at route creation time (frozen for accuracy)';

-- ============================================
-- 3. Route Reconciliations Table
-- ============================================
CREATE TABLE IF NOT EXISTS route_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE UNIQUE NOT NULL,
    reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    total_expected_cash DECIMAL(10,2) NOT NULL,  -- Sum of all Total Outstanding
    total_collected_cash DECIMAL(10,2) DEFAULT 0,
    total_returns_amount DECIMAL(10,2) DEFAULT 0,
    discrepancy DECIMAL(10,2) DEFAULT 0,  -- expected - collected - returns
    notes TEXT,
    reconciled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_reconciliations_route_id ON route_reconciliations(route_id);
CREATE INDEX IF NOT EXISTS idx_route_reconciliations_reconciled_by ON route_reconciliations(reconciled_by);

COMMENT ON TABLE route_reconciliations IS 'End-of-day reconciliation records for routes';
COMMENT ON COLUMN route_reconciliations.discrepancy IS 'Difference between expected and actual (expected - collected - returns)';

-- ============================================
-- 4. Route Reconciliation Items Table
-- ============================================
CREATE TABLE IF NOT EXISTS route_reconciliation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_id UUID REFERENCES route_reconciliations(id) ON DELETE CASCADE NOT NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    sale_item_id UUID REFERENCES sale_items(id) ON DELETE CASCADE NOT NULL,
    quantity_returned INTEGER DEFAULT 0,
    return_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_reconciliation_items_reconciliation_id ON route_reconciliation_items(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_route_reconciliation_items_sale_id ON route_reconciliation_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_route_reconciliation_items_sale_item_id ON route_reconciliation_items(sale_item_id);

COMMENT ON TABLE route_reconciliation_items IS 'Track returned quantities per sale item during reconciliation';

-- ============================================
-- 5. Modify Sales Table - Add route_id
-- ============================================
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_route_id ON sales(route_id);

COMMENT ON COLUMN sales.route_id IS 'Optional reference to route/batch this sale belongs to';

-- ============================================
-- 6. SR Cash Holdings Table (Historical Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS sr_cash_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    source VARCHAR(50) NOT NULL,  -- 'reconciliation', 'manual_adjustment', 'initial'
    reference_id UUID,  -- route_reconciliation_id or NULL
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sr_cash_holdings_user_id ON sr_cash_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_sr_cash_holdings_reference_id ON sr_cash_holdings(reference_id);
CREATE INDEX IF NOT EXISTS idx_sr_cash_holdings_created_at ON sr_cash_holdings(created_at);

COMMENT ON TABLE sr_cash_holdings IS 'Historical tracking of SR cash holdings for accountability';
COMMENT ON COLUMN sr_cash_holdings.source IS 'Source of cash holding change: reconciliation, manual_adjustment, initial';

-- ============================================
-- 7. Add current_cash_holding to users table
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_cash_holding DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN users.current_cash_holding IS 'Current cash amount held by this SR (denormalized for quick access)';

-- ============================================
-- Verification Query
-- ============================================
SELECT 
    'Route system migration completed successfully' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'routes') as routes_table_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'route_sales') as route_sales_table_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'route_reconciliations') as route_reconciliations_table_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'route_reconciliation_items') as route_reconciliation_items_table_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'sr_cash_holdings') as sr_cash_holdings_table_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'route_id') as sales_route_id_added,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_cash_holding') as users_cash_holding_added;
