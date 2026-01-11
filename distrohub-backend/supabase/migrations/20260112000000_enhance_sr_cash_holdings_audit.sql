-- Enhance SR Cash Holdings Audit Trail
-- Adds before_balance and after_balance columns for complete audit tracking
-- Created: 2026-01-12

-- ============================================
-- Add audit trail columns to sr_cash_holdings
-- ============================================
ALTER TABLE sr_cash_holdings
ADD COLUMN IF NOT EXISTS before_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS after_balance DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN sr_cash_holdings.before_balance IS 'Cash balance before this transaction (for audit trail)';
COMMENT ON COLUMN sr_cash_holdings.after_balance IS 'Cash balance after this transaction (for audit trail)';
COMMENT ON COLUMN sr_cash_holdings.amount IS 'Change amount in this transaction (positive = added, negative = deducted)';

-- Update existing records to have before_balance and after_balance
-- For existing records, we'll backfill: before_balance = 0, after_balance = amount
UPDATE sr_cash_holdings
SET 
    before_balance = 0,
    after_balance = amount
WHERE before_balance IS NULL OR after_balance IS NULL;
