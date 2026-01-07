# Sales Return System - Testing Guide

## 🧪 কিভাবে Test করবেন

### Step 1: Database Migration Run করুন

#### Option A: Supabase Dashboard থেকে
1. Supabase Dashboard এ যান
2. SQL Editor খুলুন
3. Migration file এর content copy করুন
4. SQL Editor এ paste করুন
5. Run করুন

#### Option B: Supabase CLI ব্যবহার করে
```bash
cd distrohub-backend
supabase db push
```

#### Option C: Manual SQL Execution
```sql
-- Copy-paste the entire migration file content
-- Run in your Supabase SQL Editor
```

**Verification:**
```sql
-- Check if tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('sales_returns', 'sales_return_items');
-- Should return 2 rows
```

---

### Step 2: Backend Deploy করুন

```bash
cd distrohub-backend
git add .
git commit -m "Add sales return system"
git push origin main
```

**Wait for deployment** (Render auto-deploys)

---

### Step 3: API Testing

#### Test 1: Create a Sale (প্রথমে একটি Sale তৈরি করুন)

**Request:**
```bash
POST https://distrohub-backend.onrender.com/api/sales
Headers:
  Authorization: Bearer {your_token}
  Content-Type: application/json

Body:
{
  "retailer_id": "ce5368ad-d8cc-467e-bb57-0dc7cf586e78",
  "items": [
    {
      "product_id": "4c7412d2-f7f2-4fb2-af91-8d12badb85bc",
      "batch_id": "{batch_id}",
      "quantity": 10,
      "unit_price": 70,
      "discount": 0
    }
  ],
  "payment_type": "cash",
  "paid_amount": 0,
  "notes": "Test sale for return testing"
}
```

**Response:**
```json
{
  "id": "sale-uuid-here",
  "invoice_number": "INV-20260106-XXXX",
  "total_amount": 7000.00,
  "due_amount": 7000.00,
  "items": [
    {
      "id": "sale-item-uuid-here",
      "quantity": 10,
      "total": 7000.00
    }
  ]
}
```

**Note করুন:**
- `sale_id` = sale এর id
- `sale_item_id` = sale item এর id
- `batch_id` = batch এর id

---

#### Test 2: Inventory Check (Before Return)

**Request:**
```bash
GET https://distrohub-backend.onrender.com/api/products/{product_id}/batches
Headers:
  Authorization: Bearer {your_token}
```

**Note করুন:**
- Batch quantity = X (before return)

---

#### Test 3: Retailer Due Check (Before Return)

**Request:**
```bash
GET https://distrohub-backend.onrender.com/api/retailers/{retailer_id}
Headers:
  Authorization: Bearer {your_token}
```

**Note করুন:**
- `total_due` = Y (before return)

---

#### Test 4: Create Return (Return তৈরি করুন)

**Request:**
```bash
POST https://distrohub-backend.onrender.com/api/sales/{sale_id}/return
Headers:
  Authorization: Bearer {your_token}
  Content-Type: application/json

Body:
{
  "items": [
    {
      "sale_item_id": "sale-item-uuid-here",
      "quantity_returned": 3,
      "batch_id": "batch-id-here"  // Optional
    }
  ],
  "reason": "Not delivered - test return",
  "refund_type": "adjust_due"
}
```

**Expected Response (201 Created):**
```json
{
  "id": "return-uuid",
  "return_number": "RET-20260106-XXXX",
  "sale_id": "sale-uuid",
  "retailer_id": "...",
  "retailer_name": "Ahmed Store",
  "total_return_amount": 2100.00,
  "reason": "Not delivered - test return",
  "refund_type": "adjust_due",
  "status": "completed",
  "items": [
    {
      "id": "return-item-uuid",
      "quantity_returned": 3,
      "total_returned": 2100.00
    }
  ],
  "created_at": "2026-01-06T10:00:00Z"
}
```

**✅ Verify:**
- Status code: 201
- `return_number` unique
- `total_return_amount` = 2100.00 (3 × 70)
- Items array has return items

---

#### Test 5: Inventory Check (After Return)

**Request:**
```bash
GET https://distrohub-backend.onrender.com/api/products/{product_id}/batches
```

**✅ Verify:**
- Batch quantity = X + 3 (increased by returned quantity)

---

#### Test 6: Retailer Due Check (After Return)

**Request:**
```bash
GET https://distrohub-backend.onrender.com/api/retailers/{retailer_id}
```

**✅ Verify:**
- `total_due` = Y - 2100 (decreased by return amount)

---

#### Test 7: Original Sale Check (Unchanged)

**Request:**
```bash
GET https://distrohub-backend.onrender.com/api/sales/{sale_id}
```

**✅ Verify:**
- `total_amount` = 7000.00 (UNCHANGED)
- `due_amount` = 7000.00 (UNCHANGED)
- `items[0].quantity` = 10 (UNCHANGED)

**✅ Proof:** Original sale immutable ✅

---

#### Test 8: Get Return History

**Request:**
```bash
GET https://distrohub-backend.onrender.com/api/sales/{sale_id}/returns
Headers:
  Authorization: Bearer {your_token}
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "return-uuid",
    "return_number": "RET-20260106-XXXX",
    "total_return_amount": 2100.00,
    "items": [...],
    "created_at": "2026-01-06T10:00:00Z"
  }
]
```

**✅ Verify:**
- Returns list of all returns
- Each return includes items
- Ordered by created_at (newest first)

---

#### Test 9: Multiple Returns Test

**Scenario:** Same sale এ multiple returns

**Return 1:**
```json
{
  "items": [{"sale_item_id": "...", "quantity_returned": 3}],
  "reason": "First return",
  "refund_type": "adjust_due"
}
```

**Return 2:**
```json
{
  "items": [{"sale_item_id": "...", "quantity_returned": 2}],
  "reason": "Second return",
  "refund_type": "adjust_due"
}
```

**✅ Verify:**
- Both returns succeed
- Total returned = 5 items (3 + 2)
- Inventory increased by 5
- Due decreased by sum of amounts

---

#### Test 10: Over-Return Prevention (Error Test)

**Request:**
```bash
POST /api/sales/{sale_id}/return
Body:
{
  "items": [
    {
      "sale_item_id": "...",
      "quantity_returned": 15  // More than original 10
    }
  ],
  "reason": "Test over-return",
  "refund_type": "adjust_due"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "detail": "Cannot return 15 items. Original: 10, Already returned: 0, Max allowed: 10"
}
```

**✅ Verify:**
- Status code: 400
- Clear error message
- No inventory change
- No due change

---

### Step 4: Database Verification (SQL)

#### Check Return Record:
```sql
SELECT * FROM sales_returns 
WHERE sale_id = '{sale_id}'
ORDER BY created_at DESC;
```

#### Check Return Items:
```sql
SELECT * FROM sales_return_items 
WHERE return_id = '{return_id}';
```

#### Check Batch Quantity:
```sql
SELECT id, quantity FROM product_batches 
WHERE id = '{batch_id}';
-- Should be increased
```

#### Check Retailer Due:
```sql
SELECT id, total_due FROM retailers 
WHERE id = '{retailer_id}';
-- Should be decreased
```

#### Verify Original Sale Unchanged:
```sql
SELECT id, total_amount, due_amount FROM sales 
WHERE id = '{sale_id}';
-- Should be unchanged
```

---

### Step 5: Browser Testing (Postman/Thunder Client)

#### Postman Collection:

1. **Create Sale:**
   - Method: POST
   - URL: `https://distrohub-backend.onrender.com/api/sales`
   - Headers: `Authorization: Bearer {token}`
   - Body: SaleCreate JSON

2. **Create Return:**
   - Method: POST
   - URL: `https://distrohub-backend.onrender.com/api/sales/{sale_id}/return`
   - Headers: `Authorization: Bearer {token}`
   - Body: SaleReturnCreate JSON

3. **Get Returns:**
   - Method: GET
   - URL: `https://distrohub-backend.onrender.com/api/sales/{sale_id}/returns`
   - Headers: `Authorization: Bearer {token}`

---

### Step 6: Edge Cases Testing

#### Test A: Full Return (All Items)
- Return all 10 items
- ✅ Verify: Inventory fully restored
- ✅ Verify: Due fully reduced

#### Test B: Partial Return (Some Items)
- Return 3 out of 10 items
- ✅ Verify: Only those 3 restored
- ✅ Verify: Proportional amount deducted

#### Test C: Invalid Sale ID
- Use non-existent sale_id
- ✅ Verify: 404 Not Found

#### Test D: Invalid Sale Item ID
- Use non-existent sale_item_id
- ✅ Verify: 400 Bad Request with clear error

---

## ✅ Testing Checklist

### Basic Functionality:
- [ ] Migration runs successfully
- [ ] Tables created
- [ ] Create return works (201)
- [ ] Get returns works (200)
- [ ] Inventory increases
- [ ] Retailer due decreases
- [ ] Original sale unchanged

### Validation:
- [ ] Over-return prevented (400 error)
- [ ] Invalid sale_id (404 error)
- [ ] Invalid sale_item_id (400 error)
- [ ] Multiple returns work
- [ ] Return history persists

### Database:
- [ ] sales_returns table has records
- [ ] sales_return_items table has records
- [ ] product_batches quantity increased
- [ ] retailers total_due decreased
- [ ] sales table unchanged

---

## 🐛 Troubleshooting

### Error: "Table does not exist"
- **Solution:** Run migration first

### Error: "Foreign key constraint"
- **Solution:** Check sale_id and sale_item_id are valid

### Error: "Cannot return X items"
- **Solution:** Check already returned quantities

### Error: "Batch not found"
- **Solution:** Provide batch_id in request

---

## 📊 Expected Results Summary

**Before Return:**
- Inventory: X items
- Retailer Due: ৳Y
- Sale: 10 items, ৳7000

**After Return (3 items):**
- Inventory: X + 3 items ✅
- Retailer Due: ৳(Y - 2100) ✅
- Sale: 10 items, ৳7000 (unchanged) ✅
- Return Record: Created ✅

---

**Ready to test!** 🚀

