# Problem Diagnosis (সমস্যা নির্ণয়)

## Images থেকে দেখা সমস্যাগুলো:

### 1. **SR Accountability Update হচ্ছে না** ⚠️

**সমস্যা:**
- "Edit Order" modal দিয়ে `Paid Amount` update করলে SR Accountability update হয় না
- Image-এ দেখা যাচ্ছে "Current Due: ৳20,000" এবং "Paid Amount: 0"

**কারণ:**
- `EditSaleModal` শুধু `paid_amount` field update করে (`PUT /api/sales/{id}`)
- এটি **Payment record create করে না**
- SR Accountability `payments` table-এর `collected_by` field থেকে data calculate করে
- তাই "Edit Order" modal দিয়ে payment update করলে SR-এর accountability-তে দেখা যাবে না

**সমাধান:**
- Payment record করার জন্য **"টাকা জমা" (Collect Money) button** ব্যবহার করুন
- এই button `CollectionModal` open করে যা proper `Payment` record create করে
- `CollectionModal`-এ "Collected By" field auto-fill হবে order-এর `assigned_to` থেকে

---

### 2. **Routes Page-এ কোনো Route নেই** ⚠️

**সমস্যা:**
- Routes / Batches page-এ "Total Routes: 0" দেখাচ্ছে
- Empty table with "No routes found"

**সম্ভাব্য কারণ:**
1. **Migration file run হয়নি:**
   - `20260111000000_create_route_system.sql` file Supabase SQL Editor-এ run করতে হবে
   - এই migration `routes`, `route_sales`, `route_reconciliations` table create করে

2. **Backend connection issue:**
   - Backend (Render) properly deployed নেই বা crash করছে
   - Database connection problem

**সমাধান:**
1. Supabase Dashboard → SQL Editor → `20260111000000_create_route_system.sql` file run করুন
2. Backend logs check করুন (Render dashboard)
3. Browser console-এ error check করুন

---

### 3. **Previous Due ৳0 দেখাচ্ছে** ⚠️

**সমস্যা:**
- Create Route modal-এ "Rahim Mia" এর জন্য "Previous Due: ৳0" দেখাচ্ছে
- কিন্তু order আছে "Due: ৳20,000" সহ

**সম্ভাব্য কারণ:**
1. **Order already in a route:**
   - `calculate_previous_due` function orders exclude করে যেগুলো already কোনো route-এ আছে
   - যদি এই order আগে থেকেই কোনো route-এ থাকে, তাহলে previous due-তে count হবে না

2. **Order payment_status 'paid':**
   - Function শুধু `unpaid` বা `partial` orders count করে
   - যদি order `paid` status-এ থাকে, তাহলে previous due-তে count হবে না

3. **Logic issue:**
   - `calculate_previous_due` function-এ bug থাকতে পারে

**সমাধান:**
- Check করুন order-টি already কোনো route-এ আছে কিনা
- Check করুন order-এর `payment_status` কি
- Backend logs check করুন previous due calculation-এর জন্য

---

## Quick Fix Checklist:

1. ✅ **Payment record করার জন্য "টাকা জমা" button ব্যবহার করুন** (Edit Order modal নয়)
2. ✅ **Migration file run করুন** Supabase SQL Editor-এ
3. ✅ **Backend deployment verify করুন** Render dashboard-এ
4. ✅ **Browser console check করুন** errors-এর জন্য
5. ✅ **Order-এর route_id check করুন** database-এ

---

## Code Reference:

- **Edit Order Modal:** `distrohub-frontend/src/pages/Sales.tsx` (line 753-834)
- **Collection Modal:** `distrohub-frontend/src/pages/Sales.tsx` (line 1304+)
- **Previous Due Calculation:** `distrohub-backend/app/supabase_db.py` (line 2060+)
- **Migration File:** `distrohub-backend/supabase/migrations/20260111000000_create_route_system.sql`
