-- SR Personal Guarantee: limits, risk tagging, payment approval, risk adjustments
BEGIN;

-- Per-user (SR) guarantee ceiling and how to enforce
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS sr_guarantee_limit NUMERIC(14,2) DEFAULT 0;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS sr_guarantee_enforcement TEXT DEFAULT 'off';

COMMENT ON COLUMN users.sr_guarantee_limit IS '0 = no cap; for SR: max total open SR-backed due';
COMMENT ON COLUMN users.sr_guarantee_enforcement IS 'off | warn | block';

-- Order-level: who carries credit risk
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS credit_risk_bearer TEXT DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS sr_liable_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN sales.credit_risk_bearer IS 'company | sr — who is personally liable for this credit';
COMMENT ON COLUMN sales.sr_liable_user_id IS 'When risk is SR, which SR (usually created_by)';

CREATE INDEX IF NOT EXISTS idx_sales_sr_liable ON sales(sr_liable_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_credit_risk ON sales(credit_risk_bearer);

-- Collection approval: existing rows are treated as already approved
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

UPDATE payments SET approval_status = 'approved' WHERE approval_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_approval_status ON payments(approval_status);

COMMENT ON COLUMN payments.approval_status IS 'pending_approval (SR submitted) | approved | rejected — retailer due updates only on approved';

-- Journal for salary / manual adjustments against SR risk
CREATE TABLE IF NOT EXISTS sr_risk_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sr_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  adjustment_type TEXT NOT NULL,
  reference_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sr_risk_adj_sr ON sr_risk_adjustments(sr_user_id);
CREATE INDEX IF NOT EXISTS idx_sr_risk_adj_created ON sr_risk_adjustments(created_at);

COMMIT;
