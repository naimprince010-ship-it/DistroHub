-- Add delivery status tracking to sales table
-- This allows tracking delivery status when delivery man collects payment

-- Add delivery_status column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';

-- Add delivered_at timestamp
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN sales.delivery_status IS 'Delivery status: pending, delivered, partially_delivered, returned';
COMMENT ON COLUMN sales.delivered_at IS 'Timestamp when delivery was completed';

-- Update existing sales with default status
UPDATE sales 
SET delivery_status = 'pending' 
WHERE delivery_status IS NULL;
