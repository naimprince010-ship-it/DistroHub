# Sales Order → Delivery → Payment → Return Logic (বাংলায়)

## সম্পূর্ণ প্রক্রিয়া ধাপে ধাপে

---

## ধাপ ১: Sales Order তৈরি করা

### কি হয়:
- Sales person একটি order create করে
- Example: ৳১০,০০০ এর order

### Database-এ কি save হয়:
```
sales table:
- total_amount: ৳১০,০০০ (মোট order amount)
- paid_amount: ৳০ (এখনো payment হয়নি)
- due_amount: ৳১০,০০০ (বাকি আছে)
- payment_status: "due" (payment বাকি)
- delivery_status: "pending" (delivery হয়নি)
- delivered_at: NULL (delivery time নেই)
```

### Logic:
- Order create হলে automatically `delivery_status = "pending"` set হয়
- Payment এখনো হয়নি, তাই `payment_status = "due"`

---

## ধাপ ২: Delivery Man Delivery করে এবং Payment Collect করে

### কি হয়:
- Delivery man product deliver করে
- একই সাথে payment collect করে
- Example: ৳১০,০০০ payment collect করল

### Code কি করে (create_payment method):

```python
# Step 1: Payment amount add করা
paid_amount = ৳০ + ৳১০,০০০ = ৳১০,০০০

# Step 2: Due amount calculate করা
due_amount = ৳১০,০০০ - ৳১০,০০০ = ৳০

# Step 3: Payment status check করা
if due_amount == ৳০:
    payment_status = "paid"  # ✅ সম্পূর্ণ payment হয়েছে
else:
    payment_status = "partial"  # কিছু বাকি আছে

# Step 4: Delivery status update করা (নতুন feature)
delivery_status = "delivered"  # ✅ Automatic update
delivered_at = "2026-01-08 14:30:00"  # ✅ Timestamp save
```

### Database-এ কি update হয়:
```
sales table (updated):
- total_amount: ৳১০,০০০ (unchanged)
- paid_amount: ৳১০,০০০ ✅ (updated)
- due_amount: ৳০ ✅ (updated)
- payment_status: "paid" ✅ (updated)
- delivery_status: "delivered" ✅ (automatic update)
- delivered_at: "2026-01-08 14:30:00" ✅ (timestamp save)
```

### কেন এটা গুরুত্বপূর্ণ:
- Payment collect করলেই automatically delivery status update হয়
- Manual update করতে হবে না
- Timestamp save হয়, পরে track করা যায়

---

## ধাপ ৩: কিছু Items Return আসে

### কি হয়:
- কিছু products return আসে
- Example: ৩টি items return, return amount = ৳২,০০০

### Code কি করে (create_sale_return method):

```python
# Step 1: Original sale data fetch করা
original_total = ৳১০,০০০
original_paid = ৳১০,০০০
return_amount = ৳২,০০০

# Step 2: নতুন total calculate করা
new_total_amount = ৳১০,০০০ - ৳২,০০০ = ৳৮,০০০
# মানে: Original order থেকে return amount minus

# Step 3: নতুন due amount calculate করা
new_due_amount = ৳৮,০০০ - ৳১০,০০০ = -৳২,০০০
# মানে: নতুন total থেকে already paid amount minus

# Step 4: Payment status recalculate করা
if new_due_amount <= ৳০:
    new_payment_status = "paid"  # ✅ Customer extra paid করেছে
elif original_paid > ৳০:
    new_payment_status = "partial"  # কিছু বাকি আছে
else:
    new_payment_status = "due"  # এখনো payment হয়নি

# Step 5: Original sale update করা
UPDATE sales SET
  total_amount = ৳৮,০০০,      # ✅ Adjusted
  due_amount = ৳০,             # ✅ Adjusted (negative হতে পারে না)
  payment_status = "paid"       # ✅ Recalculated
WHERE id = sale_id
```

### Database-এ কি update হয়:
```
sales table (after return):
- total_amount: ৳৮,০০০ ✅ (original থেকে return amount minus)
- paid_amount: ৳১০,০০০ ✅ (unchanged - customer already paid)
- due_amount: ৳০ ✅ (adjusted - negative হতে পারে না)
- payment_status: "paid" ✅ (recalculated)
- delivery_status: "delivered" ✅ (unchanged)
```

### কেন এটা গুরুত্বপূর্ণ:
- Return করার পর original invoice automatically adjust হয়
- Invoice সবসময় accurate থাকে
- Manual calculation করতে হবে না

---

## Real-World Example (বাস্তব উদাহরণ)

### উদাহরণ ১: Partial Payment + Return

**Scenario:**
```
Order: ৳১০,০০০
Payment 1: ৳৬,০০০ (partial payment)
Return: ৳২,০০০ (কিছু items return)
```

**Flow:**

1. **Order Create:**
   ```
   total: ৳১০,০০০
   paid: ৳০
   due: ৳১০,০০০
   payment_status: "due"
   delivery_status: "pending"
   ```

2. **Payment 1 (৳৬,০০০):**
   ```
   total: ৳১০,০০০
   paid: ৳৬,০০০ ✅
   due: ৳৪,০০০ ✅
   payment_status: "partial" ✅
   delivery_status: "delivered" ✅ (automatic)
   delivered_at: "2026-01-08 14:30:00" ✅
   ```

3. **Return (৳২,০০০):**
   ```
   new_total: ৳১০,০০০ - ৳২,০০০ = ৳৮,০০০ ✅
   new_due: ৳৮,০০০ - ৳৬,০০০ = ৳২,০০০ ✅
   payment_status: "partial" ✅ (still has due)
   delivery_status: "delivered" ✅ (unchanged)
   ```

**Result:**
- Customer এখনো ৳২,০০০ বাকি দিতে হবে
- Invoice automatically adjusted হয়েছে

---

### উদাহরণ ২: Full Payment + Return

**Scenario:**
```
Order: ৳১০,০০০
Payment: ৳১০,০০০ (full payment)
Return: ৳২,০০০
```

**Flow:**

1. **Order Create:**
   ```
   total: ৳১০,০০০
   paid: ৳০
   due: ৳১০,০০০
   payment_status: "due"
   ```

2. **Payment (৳১০,০০০):**
   ```
   total: ৳১০,০০০
   paid: ৳১০,০০০ ✅
   due: ৳০ ✅
   payment_status: "paid" ✅
   delivery_status: "delivered" ✅ (automatic)
   delivered_at: "2026-01-08 14:30:00" ✅
   ```

3. **Return (৳২,০০০):**
   ```
   new_total: ৳১০,০০০ - ৳২,০০০ = ৳৮,০০০ ✅
   new_due: ৳৮,০০০ - ৳১০,০০০ = -৳২,০০০ → ৳০ ✅
   payment_status: "paid" ✅ (customer extra paid করেছে)
   delivery_status: "delivered" ✅ (unchanged)
   ```

**Result:**
- Customer ৳২,০০০ extra paid করেছে
- পরের order-এ adjust করা যাবে
- Invoice automatically adjusted হয়েছে

---

## Key Logic Points (মূল Logic)

### ১. Payment Collection Logic:
```python
# যখন payment collect হয়:
if payment_collected:
    delivery_status = "delivered"  # ✅ Automatic
    delivered_at = current_timestamp  # ✅ Time save
    paid_amount += payment_amount
    due_amount -= payment_amount
    payment_status = "paid" if due_amount == 0 else "partial"
```

**মানে:**
- Payment collect করলেই delivery status automatically "delivered" হয়ে যায়
- Timestamp save হয়
- Payment amount add হয়
- Due amount calculate হয়
- Payment status update হয়

---

### ২. Return Adjustment Logic:
```python
# যখন return হয়:
return_amount = calculate_return_total()
new_total = original_total - return_amount
new_due = new_total - original_paid

# Payment status recalculate:
if new_due <= 0:
    status = "paid"  # Customer extra paid করেছে
elif original_paid > 0:
    status = "partial"  # কিছু বাকি আছে
else:
    status = "due"  # এখনো payment হয়নি
```

**মানে:**
- Return amount original total থেকে minus হয়
- নতুন total calculate হয়
- নতুন due amount calculate হয়
- Payment status automatically recalculate হয়

---

### ৩. Invoice Update:
- Original invoice-এর `total_amount` return amount দ্বারা adjust হয়
- `due_amount` এবং `payment_status` automatically recalculate হয়
- Invoice সবসময় accurate থাকে

---

## Benefits (লাভ)

### ১. Automatic Updates:
- Payment collect করলে delivery status automatically update হয়
- Manual update করতে হবে না

### ২. Accurate Invoicing:
- Return করার পর invoice automatically adjust হয়
- Invoice সবসময় accurate থাকে

### ৩. Audit Trail:
- সব changes track হয়
- Timestamp save হয়
- History maintain হয়

### ৪. No Manual Work:
- সব automatic
- Manual calculation করতে হবে না
- Error কম হয়

---

## Summary (সারাংশ)

### Complete Flow:
```
1. Sales Order Create
   → delivery_status: "pending"
   → payment_status: "due"

2. Delivery Man Delivers + Payment Collection
   → delivery_status: "delivered" ✅ (automatic)
   → delivered_at: timestamp ✅
   → paid_amount: updated ✅
   → payment_status: updated ✅

3. Some Items Return
   → total_amount: adjusted ✅ (original - return)
   → due_amount: recalculated ✅
   → payment_status: recalculated ✅
   → Invoice automatically updated ✅
```

### Key Features:
- ✅ Automatic delivery status update
- ✅ Automatic invoice adjustment after return
- ✅ Automatic payment status recalculation
- ✅ Timestamp tracking
- ✅ No manual work needed

---

## Code Location (কোড কোথায় আছে)

### ১. Payment Collection Logic:
**File:** `distrohub-backend/app/supabase_db.py`
**Method:** `create_payment()` (Line 961-989)

### ২. Return Adjustment Logic:
**File:** `distrohub-backend/app/supabase_db.py`
**Method:** `create_sale_return()` (Line 729-955)

### ৩. Database Migration:
**File:** `distrohub-backend/supabase/migrations/20260108000000_add_delivery_status_to_sales.sql`

---

## Test করার উপায়

### ১. Create Order:
```bash
POST /api/sales
{
  "retailer_id": "...",
  "items": [...],
  "paid_amount": 0
}
```

### ২. Collect Payment:
```bash
POST /api/payments
{
  "sale_id": "...",
  "amount": 10000,
  "payment_method": "cash"
}
```
**Check:** `delivery_status` should be "delivered"

### ৩. Create Return:
```bash
POST /api/sales/{sale_id}/returns
{
  "refund_type": "adjust_due",
  "items": [...]
}
```
**Check:** Original sale-এর `total_amount`, `due_amount`, `payment_status` updated হয়েছে

---

## Questions? (প্রশ্ন আছে?)

যদি কোনো অংশ unclear হয়, জানাবেন। আমি আরও detail দিতে পারি।
