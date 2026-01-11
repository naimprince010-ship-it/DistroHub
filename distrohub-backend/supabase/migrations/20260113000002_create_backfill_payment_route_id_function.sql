-- Create PostgreSQL function for batch backfill of payments.route_id
-- This function performs a single SQL UPDATE statement (no loops)
-- Created: 2026-01-13

CREATE OR REPLACE FUNCTION backfill_payment_route_id()
RETURNS TABLE(
    payments_updated INTEGER,
    payments_still_missing INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
    missing_count INTEGER;
BEGIN
    -- Single batch UPDATE: Set payments.route_id from sales.route_id
    -- Only where: payment.route_id IS NULL AND sale.route_id IS NOT NULL
    UPDATE payments p
    SET route_id = s.route_id
    FROM sales s
    WHERE p.sale_id = s.id
      AND p.route_id IS NULL
      AND s.route_id IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Count payments still missing route_id (for verification)
    SELECT COUNT(*) INTO missing_count
    FROM payments p
    JOIN sales s ON p.sale_id = s.id
    WHERE p.route_id IS NULL
      AND s.route_id IS NOT NULL;
    
    RETURN QUERY SELECT updated_count, missing_count;
END;
$$;

COMMENT ON FUNCTION backfill_payment_route_id() IS 'ONE-TIME BACKFILL: Updates payments.route_id from sales.route_id for historical payments. Returns count of updated rows and remaining missing rows.';
