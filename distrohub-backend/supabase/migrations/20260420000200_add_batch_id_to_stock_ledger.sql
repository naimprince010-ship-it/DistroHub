-- Add batch_id for reliable batch linkage in stock ledger
ALTER TABLE stock_ledger
ADD COLUMN IF NOT EXISTS batch_id UUID;

DO $$
BEGIN
    IF to_regclass('public.product_batches') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'stock_ledger_batch_id_fkey'
        ) THEN
            ALTER TABLE stock_ledger
            ADD CONSTRAINT stock_ledger_batch_id_fkey
            FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_ledger_batch_id
ON stock_ledger(batch_id);
