# Sales Rep Management - Check/Test Guide

## ✅ Step 1: Database Check (Supabase)

### Option A: Supabase Dashboard (Easiest)

1. **Supabase Dashboard-এ যান:**
   - https://supabase.com/dashboard
   - আপনার project select করুন

2. **SQL Editor-এ যান:**
   - Left sidebar → **SQL Editor**

3. **Verification Query Run করুন:**
   - File open করুন: `distrohub-backend/supabase/migrations/20260110000003_verify_sales_rep_management.sql`
   - সব content copy করুন
   - SQL Editor-এ paste করুন
   - **Run** button click করুন

4. **Result Check করুন:**
   - সব columns-এর জন্য `✓ exists` দেখতে হবে
   - যদি `✗ MISSING` দেখায়, তাহলে migration run করুন

### Option B: Quick Check Query

```sql
-- Quick check: All columns exist?
SELECT 
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'sales' AND column_name = 'assigned_to') as sales_assigned_to,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'sales' AND column_name = 'assigned_to_name') as sales_assigned_to_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'payments' AND column_name = 'collected_by') as payments_collected_by,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'payments' AND column_name = 'collected_by_name') as payments_collected_by_name;
```

**Expected:** সব columns = `1` (exists)

---

## ✅ Step 2: Backend API Check

### Test 1: Get Users (Sales Reps)

**API Endpoint:** `GET /api/users`

**Test Method:**
1. Browser-এ যান: `https://your-backend-url.com/api/users`
2. অথবা Postman/Thunder Client use করুন
3. **Authorization Header** add করুন: `Bearer YOUR_TOKEN`

**Expected Response:**
```json
[
  {
    "id": "...",
    "email": "salesrep@example.com",
    "name": "Sales Rep Name",
    "role": "sales_rep",
    "phone": "01712345678",
    "created_at": "2026-01-10T..."
  }
]
```

### Test 2: Create Sales Rep

**API Endpoint:** `POST /api/users`

**Request Body:**
```json
{
  "name": "Test Sales Rep",
  "email": "testrep@example.com",
  "phone": "01712345678",
  "password": "test123",
  "role": "sales_rep"
}
```

**Expected Response:** `201 Created` with user object

### Test 3: Update Sales Rep

**API Endpoint:** `PUT /api/users/{user_id}`

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "01787654321"
}
```

**Expected Response:** `200 OK` with updated user object

### Test 4: Delete Sales Rep

**API Endpoint:** `DELETE /api/users/{user_id}`

**Expected Response:** `200 OK` with message

---

## ✅ Step 3: Frontend UI Check

### Test 1: Settings Page Access

1. **Login করুন** আপনার app-এ
2. **Settings** page-এ যান
3. **"Sales Reps" tab** দেখতে হবে (User icon সহ)

### Test 2: List Sales Reps

1. **Sales Reps tab** click করুন
2. **Table** দেখতে হবে:
   - Name
   - Email
   - Phone
   - Actions (Edit, Delete buttons)

### Test 3: Add Sales Rep

1. **"+ Add Sales Rep"** button click করুন
2. **Modal** open হবে
3. **Form fill করুন:**
   - Name: "Test Rep"
   - Email: "test@example.com"
   - Phone: "01712345678" (optional)
   - Password: "test123"
4. **"Add Sales Rep"** button click করুন
5. **Success:** Table-এ নতুন rep দেখতে হবে

### Test 4: Edit Sales Rep

1. **Table-এ Edit icon** (pencil) click করুন
2. **Modal** open হবে with existing data
3. **Name/Phone update** করুন
4. **Password** leave empty (optional)
5. **"Update Sales Rep"** button click করুন
6. **Success:** Table-এ updated data দেখতে হবে

### Test 5: Delete Sales Rep

1. **Table-এ Delete icon** (trash) click করুন
2. **Confirmation dialog** দেখতে হবে
3. **"Delete"** confirm করুন
4. **Success:** Table থেকে rep remove হবে

### Test 6: Search Functionality

1. **Search box**-এ text type করুন
2. **Table filter** হবে automatically
3. Name, Email, Phone দিয়ে search কাজ করবে

---

## ✅ Step 4: Integration Check (Sales Order)

### Test: Assign Sales Rep to Order

1. **Sales page**-এ যান
2. **Existing order**-এ **Edit icon** click করুন
3. **"কালেক্টর (Assigned To)"** dropdown দেখতে হবে
4. **Sales Rep select** করুন
5. **"Update Order"** click করুন
6. **Success:** Order-এ assigned rep দেখতে হবে

### Test: Delete Sales Rep (with Assigned Orders)

1. **Sales Rep delete** করুন যার assigned orders আছে
2. **Confirmation** show হবে
3. **Delete** confirm করুন
4. **Success:** 
   - Sales Rep delete হবে
   - Assigned orders-এর `assigned_to` NULL হবে
   - Orders safe থাকবে

---

## 🐛 Troubleshooting

### Problem: "Sales Reps tab not showing"

**Solution:**
- Browser refresh করুন
- Check করুন Settings.tsx file-এ tab আছে কিনা
- Console-এ error check করুন

### Problem: "Cannot add sales rep - email already exists"

**Solution:**
- Different email use করুন
- অথবা existing rep edit করুন

### Problem: "Cannot delete sales rep - admin user"

**Solution:**
- Admin users delete করা যায় না (security)
- শুধু `sales_rep` role-এর users delete করা যায়

### Problem: "Migration not run - columns missing"

**Solution:**
1. Supabase SQL Editor-এ যান
2. `20260110000002_run_all_accountability_migrations.sql` run করুন
3. Verification query run করুন

---

## 📋 Quick Checklist

- [ ] Database columns exist (verification query)
- [ ] Backend API endpoints working (GET/POST/PUT/DELETE /api/users)
- [ ] Frontend Settings → Sales Reps tab visible
- [ ] Add Sales Rep works
- [ ] Edit Sales Rep works
- [ ] Delete Sales Rep works
- [ ] Search functionality works
- [ ] Assign Sales Rep to order works
- [ ] Delete Sales Rep clears assignments safely

---

## 🎯 Expected Behavior

### When Everything Works:

1. **Settings → Sales Reps tab:**
   - সব sales reps list হবে
   - Add/Edit/Delete buttons কাজ করবে
   - Search instant filter করবে

2. **Sales → Edit Order:**
   - "কালেক্টর (Assigned To)" dropdown-এ সব sales reps দেখাবে
   - Select করলে order-এ assign হবে

3. **Delete Sales Rep:**
   - Confirmation dialog show হবে
   - Delete করলে assigned orders safe থাকবে
   - শুধু assignment remove হবে

---

## ✅ Success Criteria

Module properly কাজ করছে যদি:

1. ✅ Database columns exist
2. ✅ Backend APIs respond correctly
3. ✅ Frontend UI loads without errors
4. ✅ Add/Edit/Delete operations work
5. ✅ Search filters correctly
6. ✅ Order assignment works
7. ✅ Safe deletion (orders preserved)

---

## 📞 Next Steps

যদি সব check pass হয়:
- ✅ Module ready to use!
- ✅ Production-এ deploy করতে পারেন

যদি কোনো problem থাকে:
- Error message note করুন
- Console logs check করুন
- Backend logs check করুন
- Migration file run করুন (যদি columns missing)
