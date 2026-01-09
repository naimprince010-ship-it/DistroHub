# Sales Rep Management - Migration Guide

## ✅ Migration File Check

**হ্যাঁ, একটি migration file run করতে হবে!**

Migration file: `distrohub-backend/supabase/migrations/20260110000002_run_all_accountability_migrations.sql`

এই migration file-টি Sales Rep Management feature-এর জন্য প্রয়োজনীয় database columns যোগ করবে।

## 📋 Step 1: Verification (প্রথমে check করুন)

Supabase SQL Editor-এ এই query run করুন:

```sql
-- File: distrohub-backend/supabase/migrations/20260110000003_verify_sales_rep_management.sql
```

অথবা manually এই query run করুন:

```sql
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sales' 
            AND column_name = 'assigned_to'
        ) THEN '✓ sales.assigned_to exists'
        ELSE '✗ sales.assigned_to MISSING - Run migration'
    END as status;
```

**যদি সব columns already exists দেখায়, তাহলে migration run করার দরকার নেই।**

## 📋 Step 2: Run Migration

### Option 1: Supabase Dashboard (Recommended)

1. Supabase Dashboard-এ যান: https://supabase.com/dashboard
2. আপনার project select করুন
3. **SQL Editor** tab-এ যান
4. File open করুন: `distrohub-backend/supabase/migrations/20260110000002_run_all_accountability_migrations.sql`
5. সব content copy করুন
6. SQL Editor-এ paste করুন
7. **Run** button click করুন

### Option 2: Command Line (যদি Supabase CLI setup থাকে)

```bash
cd distrohub-backend
supabase db push
```

## 📋 Step 3: Verify Migration

Migration run করার পর, এই query run করুন:

```sql
SELECT 
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' 
     AND table_name = 'sales' 
     AND column_name = 'assigned_to') as sales_assigned_to_added,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' 
     AND table_name = 'payments' 
     AND column_name = 'collected_by') as payments_collected_by_added;
```

**Expected Result:**
- `sales_assigned_to_added` = 1
- `payments_collected_by_added` = 1

## 🔍 What This Migration Does

এই migration file-টি এই columns যোগ করবে:

### 1. Sales Table
- `assigned_to` (UUID) - কোন SR/delivery man assign করা আছে
- `assigned_to_name` (VARCHAR) - SR-এর name (denormalized for performance)
- Index: `idx_sales_assigned_to`

### 2. Payments Table
- `collected_by` (UUID) - কোন SR payment collect করেছে
- `collected_by_name` (VARCHAR) - SR-এর name (denormalized for performance)
- Index: `idx_payments_collected_by`

### 3. Foreign Key Constraints
- `sales.assigned_to` → `users.id` (ON DELETE SET NULL)
- `payments.collected_by` → `users.id` (ON DELETE SET NULL)

**Important:** `IF NOT EXISTS` clause আছে, তাই safe to run multiple times।

## ⚠️ Important Notes

1. **Existing Data:** Existing sales এবং payments-এর জন্য এই fields `NULL` থাকবে (backward compatible)
2. **Safe to Run:** `IF NOT EXISTS` clause আছে, তাই multiple times run করা safe
3. **No Data Loss:** এই migration শুধু columns add করে, কোনো data delete করে না

## ✅ After Migration

Migration successful হলে:
1. Backend restart করুন (যদি running থাকে)
2. Frontend-এ Settings → Sales Reps tab-এ যান
3. Sales Rep add/edit/delete test করুন

## 🆘 Troubleshooting

**Error: "column already exists"**
- এটা normal, মানে migration already run হয়েছে
- Continue করুন

**Error: "relation does not exist"**
- প্রথমে initial schema migration run করুন: `20260101192453_initial_schema.sql`

**Error: "permission denied"**
- Supabase dashboard-এ admin access check করুন
- SQL Editor-এ proper permissions আছে কিনা verify করুন
