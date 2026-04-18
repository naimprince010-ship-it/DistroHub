# 🗄️ Database Migration Guide - DistroHub

## 📋 Step-by-Step Instructions

### **Option 1: Supabase SQL Editor (Recommended ✅)**

#### **Step 1: Open Supabase SQL Editor**
1. Go to: https://supabase.com/dashboard/project/llucnnzcslnulnyzourx/sql
2. Login to your Supabase account
3. Click on "SQL Editor" in the left sidebar

#### **Step 2: Run Main Schema**
1. Open file: `distrohub-backend/schema.sql`
2. Copy **ALL** content (Ctrl+A, Ctrl+C)
3. Paste in Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)
5. Wait for success message: `Schema created successfully!`

#### **Step 3: Verify Tables Created**
Run this query to check:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- users
- products
- product_batches
- retailers
- purchases
- purchase_items
- sales
- sale_items
- payments
- categories
- suppliers
- units

#### **Step 4: (Optional) Run Migration File**
If you want to add more data or update:
1. Open file: `distrohub-backend/migrations/001_add_categories_suppliers_units.sql`
2. Copy and run in SQL Editor

**Note:** This migration is mostly redundant since `schema.sql` already includes these tables, but it's safe to run.

---

### **Option 2: Using psql Command Line**

If you have PostgreSQL client installed:

```bash
# Set your Supabase connection string
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.llucnnzcslnulnyzourx.supabase.co:5432/postgres"

# Run schema
psql $DATABASE_URL -f distrohub-backend/schema.sql

# Run migration (optional)
psql $DATABASE_URL -f distrohub-backend/migrations/001_add_categories_suppliers_units.sql
```

---

## ✅ Verification Queries

After running migrations, verify with these queries:

### Check Categories:
```sql
SELECT * FROM categories;
```

### Check Suppliers:
```sql
SELECT * FROM suppliers;
```

### Check Units:
```sql
SELECT * FROM units;
```

### Check Users:
```sql
SELECT email, name, role FROM users;
```

### Check All Tables:
```sql
SELECT 
    'categories' as table_name, COUNT(*) as row_count FROM categories
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'units', COUNT(*) FROM units
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products;
```

---

## 🔧 Troubleshooting

### Error: "relation already exists"
- This means tables already exist
- Safe to ignore if using `CREATE TABLE IF NOT EXISTS`
- Or drop tables first if you want fresh start

### Error: "duplicate key value"
- Data already exists
- Safe to ignore with `ON CONFLICT DO NOTHING`

### Connection Issues
- Check Supabase project URL
- Verify database credentials
- Check if project is active

---

## 📝 Important Notes

1. **Order Matters**: Always run `schema.sql` first
2. **Backup First**: Take a backup before running migrations
3. **Test Environment**: Test on a dev database first
4. **Environment Variables**: Make sure backend has:
   - `USE_SUPABASE=true`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

---

## 🎯 Quick Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Copied `schema.sql` content
- [ ] Pasted and ran in SQL Editor
- [ ] Verified success message
- [ ] Checked tables exist
- [ ] Verified sample data inserted
- [ ] Updated backend environment variables

---

## 📞 Need Help?

If you encounter any issues:
1. Check Supabase logs
2. Verify SQL syntax
3. Check table permissions
4. Review error messages carefully



