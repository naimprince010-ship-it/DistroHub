# Sales Invoice Manual Update Plan (বাংলায়)

## Requirements Analysis

### Current Situation:
- Payment collect করলে automatically delivery status update হয়
- User চায়: Admin manually update করবে
- Delivery man হিসাব বুঝিয়ে দেবে

### Scenarios to Handle:

#### Scenario 1: Full Payment Collected
```
Order: ৳১০,০০০
Payment Collected: ৳১০,০০০ (full)
Return: ৳০
```
**Admin Update:**
- delivery_status: "delivered"
- paid_amount: ৳১০,০০০
- due_amount: ৳০
- payment_status: "paid"

---

#### Scenario 2: Partial Payment Collected
```
Order: ৳১০,০০০
Payment Collected: ৳৬,০০০ (partial)
Return: ৳০
```
**Admin Update:**
- delivery_status: "delivered" (or "partially_delivered")
- paid_amount: ৳৬,০০০
- due_amount: ৳৪,০০০
- payment_status: "partial"

---

#### Scenario 3: Some Return + Some Payment Collected
```
Order: ৳১০,০০০
Payment Collected: ৳৬,০০০
Return: ৳২,০০০
```
**Admin Update:**
- delivery_status: "delivered" (or "partially_delivered")
- paid_amount: ৳৬,০০০
- due_amount: Calculate (৳১০,০০০ - ৳২,০০০ - ৳৬,০০০ = ৳২,০০০)
- payment_status: "partial"
- **Note:** Return করার পর total_amount adjust হবে, তারপর admin manually paid_amount update করবে

---

#### Scenario 4: Full Return
```
Order: ৳১০,০০০
Payment Collected: ৳০
Return: ৳১০,০০০ (full)
```
**Admin Update:**
- delivery_status: "returned"
- paid_amount: ৳০
- due_amount: ৳০ (after return adjustment)
- payment_status: "paid" (no due)

---

#### Scenario 5: Full Payment + Some Return
```
Order: ৳১০,০০০
Payment Collected: ৳১০,০০০ (full)
Return: ৳২,০০০
```
**Admin Update:**
- delivery_status: "delivered"
- paid_amount: ৳১০,০০০
- due_amount: ৳০ (after return: ৳৮,০০০ - ৳১০,০০০ = -৳২,০০০ → ৳০)
- payment_status: "paid" (customer extra paid)

---

## Implementation Plan

### Step 1: Remove Automatic Delivery Status Update
**File:** `distrohub-backend/app/supabase_db.py`
**Method:** `create_payment()`
**Change:**
- Remove automatic `delivery_status = "delivered"` update
- Only update `paid_amount`, `due_amount`, `payment_status`
- Let admin manually set delivery status

---

### Step 2: Create Sale Update API Endpoint
**File:** `distrohub-backend/app/main.py`
**New Endpoint:**
```python
PUT /api/sales/{sale_id}
```
**Purpose:**
- Admin manually update sale invoice
- Update: `delivery_status`, `paid_amount`, `due_amount`, `payment_status`, `delivered_at`

---

### Step 3: Update Sale Model
**File:** `distrohub-backend/app/models.py`
**Add:**
```python
class SaleUpdate(BaseModel):
    delivery_status: Optional[str] = None
    paid_amount: Optional[float] = None
    due_amount: Optional[float] = None
    payment_status: Optional[PaymentStatus] = None
    delivered_at: Optional[datetime] = None
    notes: Optional[str] = None
```

---

### Step 4: Update Database Method
**File:** `distrohub-backend/app/supabase_db.py`
**New Method:**
```python
def update_sale(self, sale_id: str, data: dict) -> Optional[dict]:
    """
    Update sale invoice manually (admin only)
    Allows updating:
    - delivery_status
    - paid_amount
    - due_amount
    - payment_status
    - delivered_at
    - notes
    """
```

---

### Step 5: Frontend Update UI
**File:** `distrohub-frontend/src/pages/Sales.tsx`
**Add:**
- Edit/Update button for each sale
- Modal form to update:
  - Delivery Status (dropdown)
  - Paid Amount
  - Due Amount (auto-calculate or manual)
  - Payment Status (auto-calculate or manual)
  - Delivered At (date picker)

---

## Logic Flow

### Flow 1: Payment Collection (Manual)
```
1. Delivery man হিসাব বুঝিয়ে দেয়
2. Admin Payment entry করে
   → Payment record create হয়
   → Sale-এর paid_amount, due_amount update হয়
   → delivery_status update হয় না (manual)
3. Admin manually sale update করে
   → delivery_status set করে
   → delivered_at set করে
```

### Flow 2: Return + Payment Adjustment
```
1. Return create হয়
   → Original sale-এর total_amount adjust হয়
   → due_amount recalculate হয়
   → payment_status recalculate হয়
2. Admin manually check করে
   → paid_amount verify করে
   → delivery_status update করে
   → delivered_at set করে
```

---

## API Design

### Endpoint 1: Update Sale (Manual)
```python
PUT /api/sales/{sale_id}
Request Body:
{
  "delivery_status": "delivered",  # optional
  "paid_amount": 10000,             # optional
  "due_amount": 0,                 # optional (auto-calculate)
  "payment_status": "paid",         # optional (auto-calculate)
  "delivered_at": "2026-01-08T14:30:00",  # optional
  "notes": "Delivery completed"    # optional
}
```

**Logic:**
- If `paid_amount` provided → calculate `due_amount` = `total_amount` - `paid_amount`
- If `due_amount` provided → calculate `payment_status`
- If `delivery_status` = "delivered" → set `delivered_at` if not provided
- Update retailer due amount if payment changed

---

### Endpoint 2: Payment Collection (No Auto Delivery)
```python
POST /api/payments
Request Body:
{
  "sale_id": "...",
  "amount": 10000,
  "payment_method": "cash"
}
```

**Logic:**
- Create payment record
- Update sale: `paid_amount`, `due_amount`, `payment_status`
- **DO NOT** update `delivery_status` (manual)
- Update retailer due amount

---

## Database Schema

### Sales Table Fields:
```sql
- id
- invoice_number
- retailer_id
- total_amount          -- Original order amount
- paid_amount           -- Manually updated by admin
- due_amount            -- Calculated or manually updated
- payment_status        -- Calculated or manually updated
- delivery_status       -- Manually updated by admin
- delivered_at          -- Manually set by admin
- status                -- Order status (pending/confirmed/cancelled)
- created_at
```

---

## Frontend UI Design

### Sales List Page:
```
[Invoice] [Retailer] [Total] [Paid] [Due] [Status] [Delivery] [Actions]
INV-001   Shop A     ৳10K   ৳6K   ৳4K  Partial  Pending   [Edit] [View]
```

### Edit Sale Modal:
```
┌─────────────────────────────────────┐
│ Edit Invoice: INV-001               │
├─────────────────────────────────────┤
│ Delivery Status: [Delivered ▼]     │
│ Paid Amount:    [৳6,000]            │
│ Due Amount:     [৳4,000] (auto)    │
│ Payment Status: [Partial] (auto)    │
│ Delivered At:   [2026-01-08]        │
│ Notes:          [Delivery completed]│
│                                     │
│ [Cancel]  [Save]                    │
└─────────────────────────────────────┘
```

---

## Calculation Logic

### When Admin Updates Paid Amount:
```python
if paid_amount updated:
    due_amount = total_amount - paid_amount
    
    if due_amount <= 0:
        payment_status = "paid"
    elif paid_amount > 0:
        payment_status = "partial"
    else:
        payment_status = "due"
```

### When Return Happens:
```python
if return created:
    new_total = original_total - return_amount
    new_due = new_total - current_paid_amount
    
    if new_due <= 0:
        payment_status = "paid"
    elif current_paid_amount > 0:
        payment_status = "partial"
    else:
        payment_status = "due"
    
    # Admin needs to verify and update delivery_status manually
```

---

## Implementation Steps

### Phase 1: Backend Changes
1. ✅ Remove automatic delivery_status update from `create_payment()`
2. ✅ Create `update_sale()` method in database
3. ✅ Create `SaleUpdate` model
4. ✅ Create `PUT /api/sales/{sale_id}` endpoint

### Phase 2: Frontend Changes
1. ✅ Add Edit button in Sales list
2. ✅ Create Edit Sale modal
3. ✅ Add form fields for manual update
4. ✅ Add validation and auto-calculation

### Phase 3: Testing
1. ✅ Test all scenarios
2. ✅ Verify calculations
3. ✅ Test return + payment combinations

---

## Benefits

1. ✅ **Manual Control:** Admin has full control over delivery status
2. ✅ **Flexible:** Can handle any scenario manually
3. ✅ **Accurate:** Admin verifies before updating
4. ✅ **Audit Trail:** All changes tracked with timestamps
5. ✅ **Return Support:** Return adjustment works correctly

---

## Next Steps

1. Review this plan
2. Approve implementation
3. Start with backend changes
4. Then frontend changes
5. Test all scenarios
