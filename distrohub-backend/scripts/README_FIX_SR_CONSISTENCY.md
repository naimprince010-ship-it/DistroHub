# Fix SR Assignment Consistency - Admin Script

## Purpose

One-time admin script to fix any existing data inconsistencies where sales in routes have `sales.assigned_to` that doesn't match `routes.assigned_to`.

## Safety Features

- ✅ **Idempotent**: Can be run multiple times safely (will only fix inconsistencies)
- ✅ **Dry-run mode**: Preview changes before applying
- ✅ **Detailed logging**: Shows exactly what was fixed
- ✅ **Verification**: Checks for remaining inconsistencies after fix

## Usage

### 1. Dry-Run (Preview Changes)

```bash
cd distrohub-backend
python scripts/fix_sr_assignment_consistency.py --dry-run
```

This will:
- Scan for inconsistencies
- Show what would be fixed
- **NOT apply any changes**

### 2. Apply Fixes

```bash
cd distrohub-backend
python scripts/fix_sr_assignment_consistency.py
```

This will:
- Scan for inconsistencies
- Fix them by updating `sales.assigned_to` and `sales.assigned_to_name`
- Print summary of fixes
- Verify no inconsistencies remain

## What It Does

1. **Finds inconsistencies:**
   - Queries all sales where `route_id IS NOT NULL`
   - Compares `sales.assigned_to` with `routes.assigned_to`
   - Identifies mismatches

2. **Fixes inconsistencies:**
   - Updates `sales.assigned_to` to match `routes.assigned_to`
   - Updates `sales.assigned_to_name` to match `routes.assigned_to_name`

3. **Verifies fix:**
   - Re-scans for inconsistencies
   - Confirms all are fixed

## Expected Output

### Dry-Run Example:
```
======================================================================
SR Assignment Consistency Fix Script
======================================================================

🔍 DRY-RUN MODE: No changes will be applied

✅ Connected to Supabase

🔍 Scanning for inconsistent sales...
⚠️  Found 3 inconsistent sale(s):

   Affected routes: 2
   Affected sales: 3

Summary of inconsistencies:
  Route RT-20260112-ABCD (SR: John Doe):
    2 sale(s) with mismatched assigned_to
      - INV-001: sr-old-123 → sr-new-456
      - INV-002: sr-old-123 → sr-new-456
  Route RT-20260112-EFGH (SR: Jane Smith):
    1 sale(s) with mismatched assigned_to
      - INV-003: sr-old-789 → sr-new-012

🔍 DRY-RUN: Would fix the following:

[DRY-RUN] Would fix sale INV-001 (ID: abc12345...):
  Current: assigned_to=sr-old-123, assigned_to_name=Old SR
  Correct: assigned_to=sr-new-456, assigned_to_name=John Doe
  Route: RT-20260112-ABCD (ID: route123...)
...
```

### Actual Fix Example:
```
======================================================================
SR Assignment Consistency Fix Script
======================================================================

✅ Connected to Supabase

🔍 Scanning for inconsistent sales...
⚠️  Found 3 inconsistent sale(s):

   Affected routes: 2
   Affected sales: 3

🔧 Fixing inconsistencies...

✅ Fixed sale INV-001 (ID: abc12345...):
   Updated assigned_to: sr-old-123 → sr-new-456
   Updated assigned_to_name: Old SR → John Doe
...

======================================================================
✅ FIX COMPLETE: Fixed 3 sale(s)

🔍 Verifying fix...
✅ Verification passed: No inconsistencies remain
======================================================================
```

## When to Run

- **Before deployment**: Run dry-run to check for existing inconsistencies
- **After deployment**: Run once to fix any pre-existing inconsistencies
- **Periodic check**: Run dry-run monthly to monitor data health

## Idempotency

The script is **idempotent** - running it multiple times is safe:
- First run: Fixes all inconsistencies
- Subsequent runs: Finds 0 inconsistencies, does nothing

## Error Handling

- ✅ Connection errors: Script exits with clear error message
- ✅ Update failures: Individual sale failures are logged, script continues
- ✅ Verification failures: Warning is shown if inconsistencies remain

## Database Impact

**Minimal:**
- Only updates `sales.assigned_to` and `sales.assigned_to_name` columns
- No deletions or structural changes
- Safe to run in production

## Rollback

If needed, you can manually revert specific sales:
```sql
-- Example: Revert a specific sale (if needed)
UPDATE sales
SET assigned_to = 'old_sr_id', assigned_to_name = 'Old SR Name'
WHERE id = 'sale_id_here';
```

However, this should **NOT be necessary** as the script only fixes inconsistencies to match the correct route SR.

## Monitoring Query

After running the script, verify consistency:
```sql
-- Should return 0 rows
SELECT 
    s.id as sale_id,
    s.invoice_number,
    s.assigned_to as sale_sr,
    r.assigned_to as route_sr
FROM sales s
JOIN routes r ON s.route_id = r.id
WHERE s.assigned_to != r.assigned_to;
```

## Notes

- Script uses the same Supabase connection as the main application
- Requires `SUPABASE_URL` and `SUPABASE_KEY` environment variables
- Safe to run during business hours (read-only except for fixes)
- No downtime required
