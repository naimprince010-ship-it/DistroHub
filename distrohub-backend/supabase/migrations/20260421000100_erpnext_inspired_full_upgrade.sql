-- ERPNext-inspired full upgrade foundation
-- Module-wise rollout support: variants, UOM conversion, price lists,
-- reorder intelligence, receivable aging/credit, and margin snapshots.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Phase A: Product foundation (templates, variants, UOM conversions)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    base_uom VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES product_templates(id) ON DELETE CASCADE,
    product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS variant_option_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES product_templates(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, code)
);

CREATE TABLE IF NOT EXISTS variant_option_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_type_id UUID REFERENCES variant_option_types(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(option_type_id, code)
);

CREATE TABLE IF NOT EXISTS variant_option_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    option_type_id UUID REFERENCES variant_option_types(id) ON DELETE CASCADE,
    option_value_id UUID REFERENCES variant_option_values(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(variant_id, option_type_id)
);

CREATE TABLE IF NOT EXISTS uom_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    from_uom VARCHAR(50) NOT NULL,
    to_uom VARCHAR(50) NOT NULL,
    factor DECIMAL(16,6) NOT NULL,
    rounding_mode VARCHAR(20) DEFAULT 'round',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, from_uom, to_uom)
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_uom VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '{}'::jsonb;

ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS variant_id UUID;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS uom VARCHAR(50);
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS uom_quantity DECIMAL(16,6);

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS variant_id UUID;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS uom VARCHAR(50);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS uom_quantity DECIMAL(16,6);

-- ---------------------------------------------------------------------------
-- Phase B: Price list engine
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    currency VARCHAR(10) DEFAULT 'BDT',
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    uom VARCHAR(50),
    min_qty DECIMAL(16,6) DEFAULT 0,
    unit_price DECIMAL(16,2) NOT NULL,
    discount_percent DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retailer_price_list_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
    price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(retailer_id, price_list_id)
);

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS price_list_id UUID;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS base_price DECIMAL(16,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS resolved_price DECIMAL(16,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(16,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS price_source VARCHAR(50) DEFAULT 'manual';

-- ---------------------------------------------------------------------------
-- Phase C: Reorder intelligence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reorder_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    lead_time_days INTEGER DEFAULT 7,
    safety_stock_days INTEGER DEFAULT 3,
    min_qty INTEGER DEFAULT 0,
    max_qty INTEGER DEFAULT 0,
    moq INTEGER DEFAULT 1,
    preferred_supplier VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reorder_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    suggested_qty INTEGER NOT NULL,
    trigger_reason VARCHAR(100),
    stock_on_hand INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    avg_daily_sales DECIMAL(16,4) DEFAULT 0,
    coverage_days DECIMAL(16,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Phase D: AR aging + credit controls
-- ---------------------------------------------------------------------------

ALTER TABLE sales ADD COLUMN IF NOT EXISTS terms_days INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_status VARCHAR(50) DEFAULT 'open';

CREATE TABLE IF NOT EXISTS receivable_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    entry_type VARCHAR(50) NOT NULL,
    amount DECIMAL(16,2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope VARCHAR(50) DEFAULT 'global',
    retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
    enforcement_mode VARCHAR(20) DEFAULT 'warn',
    max_overdue_days INTEGER DEFAULT 30,
    max_over_limit_pct DECIMAL(8,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    override_amount DECIMAL(16,2) DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Phase E: Margin analytics
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sale_item_cost_snapshot (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_item_id UUID REFERENCES sale_items(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID,
    cost_method VARCHAR(50) DEFAULT 'moving_avg',
    cogs_unit DECIMAL(16,4) NOT NULL,
    cogs_total DECIMAL(16,2) NOT NULL,
    margin_amount DECIMAL(16,2) DEFAULT 0,
    margin_percent DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Backfill basics (safe no-op on reruns)
-- ---------------------------------------------------------------------------

INSERT INTO product_templates (product_id, name, base_uom)
SELECT p.id, p.name, COALESCE(p.base_uom, p.unit)
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM product_templates pt WHERE pt.product_id = p.id
);

INSERT INTO product_variants (template_id, product_id, sku, name, is_default, attributes)
SELECT pt.id, p.id, p.sku, p.name, TRUE, COALESCE(p.variant_attributes, '{}'::jsonb)
FROM products p
JOIN product_templates pt ON pt.product_id = p.id
WHERE NOT EXISTS (
    SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id
);

UPDATE products p
SET template_id = pt.id
FROM product_templates pt
WHERE pt.product_id = p.id
  AND p.template_id IS NULL;

UPDATE products p
SET variant_id = pv.id
FROM product_variants pv
WHERE pv.product_id = p.id
  AND p.variant_id IS NULL;

INSERT INTO receivable_ledger (retailer_id, sale_id, entry_type, amount, reference_type, reference_id, remarks, created_at)
SELECT s.retailer_id, s.id, 'sale', COALESCE(s.due_amount, 0), 'sale', s.id, 'initial_backfill', COALESCE(s.created_at, NOW())
FROM sales s
WHERE COALESCE(s.due_amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM receivable_ledger rl
    WHERE rl.sale_id = s.id AND rl.entry_type = 'sale'
  );

INSERT INTO receivable_ledger (retailer_id, sale_id, payment_id, entry_type, amount, reference_type, reference_id, remarks, created_at)
SELECT p.retailer_id, p.sale_id, p.id, 'payment', -COALESCE(p.amount, 0), 'payment', p.id, 'initial_backfill', COALESCE(p.created_at, NOW())
FROM payments p
WHERE COALESCE(p.amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM receivable_ledger rl
    WHERE rl.payment_id = p.id AND rl.entry_type = 'payment'
  );

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_product_templates_product_id ON product_templates(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_template_id ON product_variants(template_id);
CREATE INDEX IF NOT EXISTS idx_uom_conversions_product_id ON uom_conversions(product_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_product_id ON price_list_items(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_price_list_items_scope
ON price_list_items(
    price_list_id,
    product_id,
    COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(uom, '')
);
CREATE INDEX IF NOT EXISTS idx_retailer_price_list_assignments_retailer ON retailer_price_list_assignments(retailer_id);
CREATE INDEX IF NOT EXISTS idx_reorder_suggestions_product_id ON reorder_suggestions(product_id);
CREATE INDEX IF NOT EXISTS idx_receivable_ledger_retailer_id ON receivable_ledger(retailer_id);
CREATE INDEX IF NOT EXISTS idx_receivable_ledger_created_at ON receivable_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_item_cost_snapshot_sale_item_id ON sale_item_cost_snapshot(sale_item_id);
