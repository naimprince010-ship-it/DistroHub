# Migration File Test Guide (বাংলা)

## 🎯 Migration File Update Test করার পদ্ধতি

### Step 1: Database Schema Check (বর্তমান অবস্থা যাচাই)

#### 1.1 Supabase SQL Editor এ যান
- Supabase Dashboard → SQL Editor
- অথবা local database connection use করুন

#### 1.2 Current Schema Check করুন

```sql
-- Sales table এর structure check করুন
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;
```

**Expected Output (delivery_status থাকলে):**
```
column_name        | data_type                  | is_nullable | column_default
-------------------|----------------------------|-------------|----------------
id                 | uuid                       | NO          | uuid_generate_v4()
invoice_number     | character varying          | NO          | NULL
...
delivery_status    | character varying          | YES         | 'pending'
delivered_at       | timestamp with time zone   | YES         | NULL
```

#### 1.3 Specific Column Check

```sql
-- delivery_status column আছে কিনা check করুন
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sales' 
    AND column_name = 'delivery_status'
) as delivery_status_exists;

-- delivered_at column আছে কিনা check করুন
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sales' 
    AND column_name = 'delivered_at'
) as delivered_at_exists;
```

**Expected Result:**
- `delivery_status_exists` = `true` ✅
- `delivered_at_exists` = `true` ✅

---

### Step 2: Migration File Verify (Migration apply হয়েছে কিনা)

#### 2.1 Migration File Check করুন

```bash
# Migration file path
distrohub-backend/supabase/migrations/20260108000000_add_delivery_status_to_sales.sql
```

#### 2.2 Migration Content Verify করুন

Migration file এ এই commands থাকা উচিত:
```sql
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

UPDATE sales 
SET delivery_status = 'pending' 
WHERE delivery_status IS NULL;
```

#### 2.3 Test Migration Apply করুন (Safe Test)

```sql
-- Test run করুন (safe - IF NOT EXISTS use করবে)
-- যদি column already থাকে, error দেবে না

-- Step 1: Check current state
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('delivery_status', 'delivered_at');

-- Step 2: Try to add (safe - won't error if exists)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Verify after
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('delivery_status', 'delivered_at');
```

---

### Step 3: Data Integrity Check (Data consistency verify)

#### 3.1 Existing Data Check

```sql
-- Existing sales records check করুন
SELECT 
    id,
    invoice_number,
    delivery_status,
    delivered_at,
    created_at
FROM sales 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected:**
- সব records এ `delivery_status` থাকবে (NULL না)
- Default value `'pending'` হওয়া উচিত

#### 3.2 NULL Values Check

```sql
-- NULL delivery_status আছে কিনা check করুন
SELECT COUNT(*) as null_delivery_status_count
FROM sales 
WHERE delivery_status IS NULL;

-- Expected: 0 (শূন্য)
```

#### 3.3 Default Value Check

```sql
-- Default value 'pending' set হয়েছে কিনা check করুন
SELECT 
    delivery_status,
    COUNT(*) as count
FROM sales 
GROUP BY delivery_status;
```

**Expected Output:**
```
delivery_status | count
----------------|------
pending         | 10
delivered       | 2
```

---

### Step 4: Application Code Check (Code consistency)

#### 4.1 Backend Model Check

```bash
# Check models.py
grep -n "delivery_status" distrohub-backend/app/models.py
```

**Expected:**
```python
delivery_status: Optional[str] = None
```

#### 4.2 Database Query Check

```bash
# Check supabase_db.py
grep -n "delivery_status" distrohub-backend/app/supabase_db.py
```

**Expected:**
- `update_data["delivery_status"]` references থাকবে
- API endpoint এ handle করা হবে

#### 4.3 Frontend Type Check

```bash
# Check types/index.ts
grep -n "delivery_status" distrohub-frontend/src/types/index.ts
```

---

### Step 5: API Test (End-to-End Test)

#### 5.1 Create Test Script

Create file: `test_delivery_status_migration.py`

```python
import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"  # বা production URL
TOKEN = "your_auth_token_here"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_get_sales_with_delivery_status():
    """Test GET /api/sales returns delivery_status"""
    response = requests.get(f"{BASE_URL}/api/sales", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        if data and len(data) > 0:
            sale = data[0]
            assert 'delivery_status' in sale, "delivery_status field missing!"
            print(f"✅ delivery_status found: {sale.get('delivery_status')}")
            return True
        else:
            print("⚠️ No sales data to test")
            return False
    else:
        print(f"❌ API Error: {response.status_code}")
        print(response.text)
        return False

def test_update_delivery_status():
    """Test PATCH /api/sales/{id} with delivery_status"""
    # First get a sale ID
    response = requests.get(f"{BASE_URL}/api/sales", headers=headers)
    if response.status_code != 200 or not response.json():
        print("⚠️ No sales to update")
        return False
    
    sale_id = response.json()[0]['id']
    
    # Update delivery_status
    update_data = {
        "delivery_status": "delivered"
    }
    
    response = requests.patch(
        f"{BASE_URL}/api/sales/{sale_id}",
        headers=headers,
        json=update_data
    )
    
    if response.status_code == 200:
        updated_sale = response.json()
        assert updated_sale.get('delivery_status') == 'delivered'
        print(f"✅ delivery_status updated successfully")
        return True
    else:
        print(f"❌ Update failed: {response.status_code}")
        print(response.text)
        return False

if __name__ == "__main__":
    print("Testing delivery_status migration...")
    print("=" * 50)
    
    test1 = test_get_sales_with_delivery_status()
    test2 = test_update_delivery_status()
    
    if test1 and test2:
        print("\n✅ All tests passed! Migration is working correctly.")
    else:
        print("\n❌ Some tests failed. Check migration status.")
```

#### 5.2 Run Test

```bash
cd distrohub-backend
python test_delivery_status_migration.py
```

---

### Step 6: Quick Verification Checklist

#### ✅ Database Level
- [ ] `delivery_status` column exists in `sales` table
- [ ] `delivered_at` column exists in `sales` table
- [ ] Default value is `'pending'`
- [ ] No NULL values in existing records
- [ ] Column type is `VARCHAR(50)`

#### ✅ Migration File
- [ ] Migration file exists: `20260108000000_add_delivery_status_to_sales.sql`
- [ ] Uses `IF NOT EXISTS` (safe to re-run)
- [ ] Updates existing NULL values
- [ ] Has proper comments

#### ✅ Backend Code
- [ ] `models.py` has `delivery_status` field
- [ ] `supabase_db.py` handles `delivery_status` in updates
- [ ] API endpoints accept `delivery_status` parameter

#### ✅ Frontend Code
- [ ] TypeScript types include `delivery_status`
- [ ] ChallanPrint component uses `delivery_status`
- [ ] Status badges display correctly

---

### Step 7: Common Issues & Solutions

#### Issue 1: Column doesn't exist
**Error:** `column "delivery_status" does not exist`

**Solution:**
```sql
-- Run migration manually
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';
```

#### Issue 2: NULL values in existing data
**Problem:** Old records have NULL `delivery_status`

**Solution:**
```sql
-- Update NULL values
UPDATE sales 
SET delivery_status = 'pending' 
WHERE delivery_status IS NULL;
```

#### Issue 3: Migration already applied
**Check:**
```sql
-- If column exists, migration is applied
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' 
    AND column_name = 'delivery_status'
);
```

**If `true`:** Migration already applied ✅  
**If `false`:** Need to run migration

---

### Step 8: Automated Test Script

Create: `verify_migration.py`

```python
#!/usr/bin/env python3
"""
Migration Verification Script
Tests if delivery_status migration is properly applied
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def check_column_exists(supabase: Client, table: str, column: str) -> bool:
    """Check if column exists in table"""
    try:
        # Try to query the column
        result = supabase.table(table).select(column).limit(1).execute()
        return True
    except Exception as e:
        if "column" in str(e).lower() and "does not exist" in str(e).lower():
            return False
        raise

def verify_migration():
    """Verify delivery_status migration"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ SUPABASE_URL and SUPABASE_KEY must be set")
        return False
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Verifying delivery_status migration...")
    print("=" * 50)
    
    # Check columns
    delivery_status_exists = check_column_exists(supabase, "sales", "delivery_status")
    delivered_at_exists = check_column_exists(supabase, "sales", "delivered_at")
    
    print(f"delivery_status column: {'✅ EXISTS' if delivery_status_exists else '❌ MISSING'}")
    print(f"delivered_at column: {'✅ EXISTS' if delivered_at_exists else '❌ MISSING'}")
    
    if not delivery_status_exists or not delivered_at_exists:
        print("\n❌ Migration not applied! Run migration file.")
        return False
    
    # Check data
    try:
        result = supabase.table("sales").select("delivery_status").limit(10).execute()
        null_count = sum(1 for row in result.data if row.get("delivery_status") is None)
        
        print(f"\nNULL delivery_status count: {null_count}")
        if null_count > 0:
            print("⚠️ Some records have NULL delivery_status")
        else:
            print("✅ All records have delivery_status")
    except Exception as e:
        print(f"⚠️ Could not check data: {e}")
    
    print("\n✅ Migration verification complete!")
    return True

if __name__ == "__main__":
    success = verify_migration()
    sys.exit(0 if success else 1)
```

**Run:**
```bash
export SUPABASE_URL="your_url"
export SUPABASE_KEY="your_key"
python verify_migration.py
```

---

## 📝 Summary

### Quick Test Commands

```sql
-- 1. Check if migration applied
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' 
    AND column_name = 'delivery_status'
);

-- 2. Check data consistency
SELECT delivery_status, COUNT(*) 
FROM sales 
GROUP BY delivery_status;

-- 3. Check NULL values
SELECT COUNT(*) 
FROM sales 
WHERE delivery_status IS NULL;
```

### Expected Results
- ✅ Column exists
- ✅ All records have delivery_status
- ✅ NULL count = 0
- ✅ Default value = 'pending'

### If Migration Needed
1. Go to Supabase SQL Editor
2. Copy migration file content
3. Run in SQL Editor
4. Verify with above queries

---

**Last Updated:** 2026-01-08  
**Migration File:** `20260108000000_add_delivery_status_to_sales.sql`
