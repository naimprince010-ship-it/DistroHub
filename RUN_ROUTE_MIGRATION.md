# Route System Migration - Supabase SQL Editor

## ✅ IMPORTANT: Run this migration in Supabase

This migration creates all tables needed for the Route/Batch system, SR Accountability, and Reconciliation features.

## Steps to Run:

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor:**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste the Migration:**
   - Open file: `distrohub-backend/supabase/migrations/20260111000000_create_route_system.sql`
   - Copy the entire content
   - Paste into Supabase SQL Editor

4. **Run the Migration:**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion

5. **Verify Success:**
   - The migration will show a verification query result at the end
   - All tables should show `1` (exists) in the result

## What This Migration Creates:

✅ `routes` table - Route/batch management
✅ `route_sales` table - Links sales to routes with previous_due snapshots
✅ `route_reconciliations` table - End-of-day reconciliation records
✅ `route_reconciliation_items` table - Returned items tracking
✅ `sr_cash_holdings` table - Historical SR cash tracking
✅ Adds `route_id` column to `sales` table
✅ Adds `current_cash_holding` column to `users` table

## After Migration:

- Backend will be able to create routes
- SR Accountability will work properly
- Reconciliation features will be available
- Payment tracking will work correctly

## Note:

- Migration uses `CREATE TABLE IF NOT EXISTS` - safe to run multiple times
- Migration uses `ADD COLUMN IF NOT EXISTS` - won't duplicate columns
- All indexes are created with `IF NOT EXISTS` - safe to rerun
