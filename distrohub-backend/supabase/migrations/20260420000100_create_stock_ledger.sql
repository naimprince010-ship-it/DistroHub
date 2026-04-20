-- Stock ledger for immutable inventory movements (ERP-style traceability)
CREATE TABLE IF NOT EXISTS stock_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT,
    batch_id UUID,
    batch_number TEXT,
    warehouse_id UUID,
    warehouse_name TEXT,
    voucher_type TEXT NOT NULL,
    voucher_id UUID,
    quantity_change INTEGER NOT NULL,
    quantity_after INTEGER,
    unit_cost NUMERIC(12,2),
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF to_regclass('public.warehouses') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'stock_ledger_warehouse_id_fkey'
        ) THEN
            ALTER TABLE stock_ledger
            ADD CONSTRAINT stock_ledger_warehouse_id_fkey
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

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

DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'stock_ledger_created_by_fkey'
        ) THEN
            ALTER TABLE stock_ledger
            ADD CONSTRAINT stock_ledger_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_ledger_created_at
ON stock_ledger(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_created
ON stock_ledger(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_batch_id
ON stock_ledger(batch_id);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_voucher
ON stock_ledger(voucher_type, voucher_id);

COMMENT ON TABLE stock_ledger IS 'Immutable stock movement log used for reconciliation and audit trail.';
COMMENT ON COLUMN stock_ledger.quantity_change IS 'Positive for incoming stock, negative for outgoing stock.';
