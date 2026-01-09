# Database Migration Instructions (বাংলায়)

## Migration File: `20260108000000_add_delivery_status_to_sales.sql`

এই migration file run করতে হবে manual payment update feature ব্যবহার করার জন্য।

### কি করবে এই Migration:
1. `sales` table-এ `delivery_status` column add করবে
2. `sales` table-এ `delivered_at` timestamp column add করবে
3. Existing sales records-এ default value set করবে

### কিভাবে Run করবেন:

#### Method 1: Supabase Dashboard (Recommended)

1. **Supabase Dashboard-এ যান:**
   - https://supabase.com/dashboard
   - আপনার project select করুন

2. **SQL Editor খুলুন:**
   - Left sidebar থেকে "SQL Editor" click করুন
   - অথবা direct link: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new`

3. **Migration SQL Copy করুন:**
   ```sql
   -- Add delivery status tracking to sales table
   -- This allows tracking delivery status when delivery man collects payment

   -- Add delivery_status column to sales table
   ALTER TABLE sales 
   ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';

   -- Add delivered_at timestamp
   ALTER TABLE sales 
   ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

   -- Add comment
   COMMENT ON COLUMN sales.delivery_status IS 'Delivery status: pending, delivered, partially_delivered, returned';
   COMMENT ON COLUMN sales.delivered_at IS 'Timestamp when delivery was completed';

   -- Update existing sales with default status
   UPDATE sales 
   SET delivery_status = 'pending' 
   WHERE delivery_status IS NULL;
   ```

4. **SQL Run করুন:**
   - SQL Editor-এ paste করুন
   - "Run" button click করুন (অথবা `Ctrl+Enter`)
   - Success message দেখবেন

#### Method 2: Supabase CLI (Advanced)

যদি Supabase CLI install করা থাকে:

```bash
cd distrohub-backend
supabase db push
```

### Verification (যাচাইকরণ):

Migration run করার পর verify করুন:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sales' 
  AND column_name IN ('delivery_status', 'delivered_at');
```

Expected Output:
```
column_name      | data_type                  | column_default
-----------------|----------------------------|----------------
delivery_status  | character varying(50)      | 'pending'
delivered_at     | timestamp with time zone   | NULL
```

### Important Notes:

1. **Safe to Run Multiple Times:**
   - `IF NOT EXISTS` clause ব্যবহার করা হয়েছে
   - Multiple times run করলেও problem হবে না

2. **No Data Loss:**
   - Existing data safe থাকবে
   - শুধু নতুন columns add হবে

3. **Default Values:**
   - Existing sales records-এ `delivery_status = 'pending'` set হবে
   - `delivered_at` NULL থাকবে (delivery complete হলে update হবে)

### Troubleshooting:

**Error: "column already exists"**
- এটা normal, মানে column আগে থেকেই আছে
- Continue করতে পারেন

**Error: "permission denied"**
- Supabase project-এর owner/admin account দিয়ে login করুন
- অথবা proper role/permission check করুন

### After Migration:

Migration successful হলে:
1. Backend API automatically নতুন columns use করবে
2. Frontend UI-তে delivery status update করতে পারবেন
3. Manual payment update feature fully functional হবে

### Migration File Location:
```
distrohub-backend/supabase/migrations/20260108000000_add_delivery_status_to_sales.sql
```
