-- Add route_id to payments table
-- This allows payments to be directly linked to routes for SR Accountability
-- Created: 2026-01-13

-- Add route_id column to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE SET NULL;

-- Add index for filtering payments by route
CREATE INDEX IF NOT EXISTS idx_payments_route_id ON payments(route_id);

COMMENT ON COLUMN payments.route_id IS 'Route ID if payment is for a sale in a route (denormalized for SR Accountability)';

-- Verification
SELECT 
    'route_id column added to payments table' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'route_id') as route_id_column_exists;
