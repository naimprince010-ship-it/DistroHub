# Migration Test - Quick Start Guide (বাংলা)

## 🚀 দ্রুত Test করার ৩টি পদ্ধতি

### Method 1: SQL Script (সবচেয়ে সহজ)

**File:** `distrohub-backend/verify_delivery_status_migration.sql`

1. Supabase Dashboard → SQL Editor এ যান
2. File content copy করুন
3. Run করুন
4. Result check করুন

**Expected Output:**
```
✅ delivery_status column EXISTS
✅ delivered_at column EXISTS
✅ No NULL delivery_status values
```

---

### Method 2: Python Script (Automated)

**File:** `distrohub-backend/test_migration_quick.py`

```bash
# Environment variables set করুন
export SUPABASE_URL="your_supabase_url"
export SUPABASE_KEY="your_supabase_key"

# Script run করুন
cd distrohub-backend
python test_migration_quick.py
```

**Expected Output:**
```
🔍 Testing delivery_status migration...
============================================================
✅ Test 1: delivery_status column EXISTS
✅ Test 2: delivered_at column EXISTS
✅ Test 3: No NULL delivery_status values (10 records checked)

📊 Delivery Status Distribution:
   pending: 8
   delivered: 2

============================================================
✅ Migration verification complete!
```

---

### Method 3: Manual SQL Check (Quick)

Supabase SQL Editor এ এই query run করুন:

```sql
-- Quick check: Column exists?
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' 
    AND column_name = 'delivery_status'
) as migration_applied;
```

**Result:**
- `true` = Migration applied ✅
- `false` = Migration needed ❌

---

## ❌ যদি Migration Apply না হয়ে থাকে

### Solution: Manual Migration Run

1. **Supabase SQL Editor** এ যান
2. এই SQL run করুন:

```sql
-- Add delivery_status column
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';

-- Add delivered_at column
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Update existing NULL values
UPDATE sales 
SET delivery_status = 'pending' 
WHERE delivery_status IS NULL;
```

3. **Verify** করুন (Method 1, 2, বা 3 use করুন)

---

## 📋 Checklist

- [ ] `delivery_status` column exists
- [ ] `delivered_at` column exists  
- [ ] No NULL values in `delivery_status`
- [ ] Default value is `'pending'`
- [ ] Backend code uses `delivery_status`
- [ ] Frontend displays status badges

---

## 🔧 Troubleshooting

### Problem: "column does not exist"
**Solution:** Run migration SQL (see above)

### Problem: NULL values found
**Solution:** 
```sql
UPDATE sales 
SET delivery_status = 'pending' 
WHERE delivery_status IS NULL;
```

### Problem: Python script can't connect
**Solution:** Check `SUPABASE_URL` and `SUPABASE_KEY` environment variables

---

## 📁 Files Created

1. `MIGRATION_TEST_GUIDE.md` - Detailed guide
2. `distrohub-backend/verify_delivery_status_migration.sql` - SQL verification script
3. `distrohub-backend/test_migration_quick.py` - Python test script
4. `MIGRATION_TEST_QUICK_START.md` - This file

---

**Quick Command:**
```bash
# Python test
cd distrohub-backend
export SUPABASE_URL="..." SUPABASE_KEY="..."
python test_migration_quick.py
```
