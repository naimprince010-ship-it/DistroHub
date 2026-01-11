# Route System Migration Instructions

## Migration File: `20260111000000_create_route_system.sql`

এই migration file Supabase SQL Editor-এ run করতে হবে।

## Steps to Run Migration:

1. **Supabase Dashboard-এ যান:**
   - https://supabase.com/dashboard
   - আপনার project select করুন

2. **SQL Editor খুলুন:**
   - Left sidebar-এ "SQL Editor" click করুন
   - "New query" button click করুন

3. **Migration file copy করুন:**
   - `distrohub-backend/supabase/migrations/20260111000000_create_route_system.sql` file open করুন
   - সম্পূর্ণ content copy করুন

4. **SQL Editor-এ paste করুন:**
   - SQL Editor-এ paste করুন
   - "Run" button click করুন (বা Ctrl+Enter press করুন)

5. **Success message check করুন:**
   - "Success. No rows returned" বা similar message দেখতে হবে
   - কোনো error থাকলে fix করুন

## What This Migration Creates:

1. **`routes` table** - Route/Batch management
2. **`route_sales` table** - Junction table for routes and sales (with previous_due snapshot)
3. **`route_reconciliations` table** - End-of-day reconciliation records
4. **`route_reconciliation_items` table** - Individual item returns in reconciliation
5. **`sr_cash_holdings` table** - SR cash accountability tracking
6. **Adds `route_id` column** to `sales` table
7. **Adds `current_cash_holding` column** to `users` table

## Important Notes:

- ✅ এই migration একবার run করলেই হবে
- ✅ যদি error আসে, check করুন table already exists কিনা
- ✅ Migration run করার পর backend restart করতে হতে পারে
- ✅ Frontend refresh করুন routes দেখার জন্য

## Troubleshooting:

**Error: "relation already exists"**
- Table already আছে, skip করুন বা DROP TABLE করে আবার run করুন

**Error: "column already exists"**
- Column already আছে, ALTER TABLE statements comment out করুন

**No error but routes still not showing:**
- Backend restart করুন
- Browser refresh করুন
- Check করুন backend logs-এ error আছে কিনা
