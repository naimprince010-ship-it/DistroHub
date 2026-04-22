-- SR vs DSR: migrate legacy sales_rep users to dsr; book sales created_by
BEGIN;

-- Legacy app role: all former sales_reps are delivery / collection (DSR)
UPDATE users
SET role = 'dsr'
WHERE role = 'sales_rep';

-- Optional: if a check constraint on users.role exists, adjust in production manually.
-- Default schema uses VARCHAR(50) without check.

-- Attribute pre-sales (SR) on sale rows
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);

COMMIT;
