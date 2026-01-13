# Demo Retailers Delete Guide

## Overview
This guide explains how to delete demo/test retailers from the Receivables page.

## Demo Retailers to Delete
The following demo retailers were inserted during initial setup:
- **Karim Uddin** - Karim Store - 01712345678
- **Abdul Haque** - Haque Grocery - 01812345678
- **Rahim Mia** - Rahim Bhandar - 01912345678
- **Jamal Ahmed** - Ahmed Store - 01612345678

---

## Method 1: SQL Script (Recommended)

### Steps:
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the entire content from `DELETE_DEMO_RETAILERS.sql`
3. **IMPORTANT:** First run the SELECT query (Step 1) to verify which demo retailers exist
4. Review the results
5. If confirmed, run the DELETE statements (Steps 3-4)
6. Verify deletion with Step 5 (should return 0)

### What the script does:
- ✅ Checks which demo retailers exist
- ✅ Deletes related payments
- ✅ Deletes related sales
- ✅ Deletes route_sales entries
- ✅ Deletes the retailers
- ✅ Verifies deletion

---

## Method 2: Admin API Endpoint

### Endpoint:
```
POST /api/admin/delete-demo-retailers
```

### Requirements:
- Must be logged in as **admin**
- Authentication token required

### Usage:
```bash
curl -X POST https://distrohub-backend.onrender.com/api/admin/delete-demo-retailers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response:
```json
{
  "message": "Deleted 4 demo retailer(s)",
  "deleted_count": 4,
  "retailer_ids": ["uuid1", "uuid2", "uuid3", "uuid4"],
  "payments_affected": 0
}
```

---

## Method 3: Manual Deletion via UI

1. Go to **Retailers** page
2. Search for demo retailers by name:
   - Karim Uddin
   - Abdul Haque
   - Rahim Mia
   - Jamal Ahmed
3. Click **Delete** button for each retailer
4. Confirm deletion

**Note:** This method requires deleting related payments and sales first if they exist.

---

## Verification

After deletion, verify:

1. **Receivables Page:**
   - Go to Receivables (বাকি হিসাব)
   - Demo shops should not appear
   - Only real retailers should be listed

2. **Retailers Page:**
   - Go to Retailers page
   - Demo shops should not appear

3. **SQL Verification:**
   ```sql
   SELECT COUNT(*) 
   FROM retailers
   WHERE name IN ('Karim Uddin', 'Abdul Haque', 'Rahim Mia', 'Jamal Ahmed');
   -- Should return 0
   ```

---

## Important Notes

⚠️ **Warning:**
- Deleting retailers will also delete related payments and sales
- This action cannot be undone
- Make sure you're deleting demo data, not real customer data

✅ **Safe to delete if:**
- These are test/demo retailers
- No real business transactions are associated with them
- You want a clean production database

❌ **Do NOT delete if:**
- These retailers have real business data
- There are actual sales/payments associated with them
- You're unsure about the data

---

## Troubleshooting

### Error: Foreign key constraint violation
**Solution:** Run the SQL script which deletes related data first (payments, sales) before deleting retailers.

### Error: Retailer not found
**Solution:** The demo retailers may have already been deleted. Check with the SELECT query first.

### API returns 403 Forbidden
**Solution:** Make sure you're logged in as admin. Check your user role in the database.

---

## Files

- `DELETE_DEMO_RETAILERS.sql` - SQL script for manual deletion
- `distrohub-backend/app/main.py` - Admin API endpoint (line ~695)

---

**Status:** Ready to use
**Last Updated:** 2026-01-13
