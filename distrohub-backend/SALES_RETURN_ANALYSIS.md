# Sales Return System - Analysis & Design

## 1. ANALYSIS

### Current Sales Flow

**Location: `app/supabase_db.py::create_sale()` (lines 250-408)**

#### When Sale is Created:
1. **Inventory Reduction:**
   - Line 377: `self.update_batch_quantity(item["batch_id"], -item["quantity"])`
   - Function: `update_batch_quantity()` (lines 130-136)
   - Updates `product_batches.quantity` by subtracting sold quantity

2. **Retailer Due Increase:**
   - Line 303: `self.update_retailer_due(data["retailer_id"], due_amount)`
   - Function: `update_retailer_due()` (lines 155-161)
   - Updates `retailers.total_due` by adding `due_amount = total_amount - paid_amount`

3. **Sale Record Creation:**
   - Table: `sales` (schema.sql:111-125)
   - Stores: invoice_number, retailer_id, total_amount, paid_amount, due_amount, status
   - Immutable: Once created, sale records are NOT modified

4. **Sale Items Creation:**
   - Table: `sale_items` (schema.sql:128-138)
   - Stores: sale_id (FK), product_id, batch_number, quantity, unit_price, total
   - Links to: sales table via `sale_id`

### Key Functions Reference:
- `update_batch_quantity(batch_id, quantity_change)`: Increments/decrements batch stock
- `update_retailer_due(retailer_id, amount_change)`: Adjusts retailer total_due field

---

## 2. DESIGN

### Approach: Sales Return / Credit Note Model

**Principle: Additive, Non-Mutating**
- Original `sales` records remain untouched (audit safety)
- Returns stored as separate transaction linked to original sale
- Inventory corrected by incrementing batch quantities
- Retailer due adjusted by decrementing amount

### Data Flow:
```
Sale (Order: 10 items, Due: ৳7000)
  ↓
Return (Returned: 3 items, Value: ৳2100)
  ↓
Net Result:
  - Delivered: 7 items
  - Net Due: ৳4900
  - Stock: +3 items (returned to inventory)
```

### Database Schema:

#### New Table: `sales_returns`
```sql
CREATE TABLE sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(100) NOT NULL UNIQUE,
    sale_id UUID REFERENCES sales(id) NOT NULL,
    retailer_id UUID REFERENCES retailers(id) NOT NULL,
    retailer_name VARCHAR(255) NOT NULL,
    total_return_amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    refund_type VARCHAR(50) DEFAULT 'adjust_due', -- 'adjust_due' | 'refund_cash' | 'credit_note'
    status VARCHAR(50) DEFAULT 'completed',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### New Table: `sales_return_items`
```sql
CREATE TABLE sales_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES sale_items(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    batch_id UUID REFERENCES product_batches(id),
    quantity_returned INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total_returned DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Business Rules:

1. **Validation:**
   - Return quantity ≤ Original sold quantity (per item)
   - Cannot return more than already returned
   - Sale must exist and be confirmed

2. **Inventory Correction:**
   - Increment batch quantity by returned quantity
   - If batch doesn't exist, create or find matching batch

3. **Due Adjustment:**
   - Reduce retailer `total_due` by return amount
   - Only if `refund_type = 'adjust_due'`
   - Cash refunds handled separately (future)

4. **Audit Trail:**
   - Every return creates immutable record
   - Linked to original sale via `sale_id`
   - Timestamp and user tracking

---

## 3. BACKEND IMPLEMENTATION PLAN

### API Endpoints:

#### POST `/api/sales/{sale_id}/return`
**Purpose:** Create a sales return transaction

**Payload:**
```json
{
  "items": [
    {
      "sale_item_id": "uuid",
      "quantity_returned": 3,
      "batch_id": "uuid"  // Optional, for specific batch tracking
    }
  ],
  "reason": "Not delivered / Damaged / Customer request",
  "refund_type": "adjust_due"  // or "credit_note"
}
```

**Response:**
```json
{
  "id": "uuid",
  "return_number": "RET-20260106-XXXX",
  "sale_id": "uuid",
  "total_return_amount": 2100.00,
  "items": [...],
  "created_at": "2026-01-06T10:00:00Z"
}
```

#### GET `/api/sales/{sale_id}/returns`
**Purpose:** Get all returns for a specific sale

**Response:**
```json
{
  "returns": [
    {
      "id": "uuid",
      "return_number": "RET-20260106-XXXX",
      "total_return_amount": 2100.00,
      "items": [...],
      "created_at": "2026-01-06T10:00:00Z"
    }
  ],
  "total_returned": 2100.00,
  "remaining_due": 4900.00
}
```

### Implementation Logic:

1. **Validation Phase:**
   - Fetch original sale and items
   - Calculate already returned quantities (sum from `sales_return_items`)
   - Validate: `quantity_returned <= (original_qty - already_returned_qty)`

2. **Transaction Phase (All-or-Nothing):**
   - Insert `sales_returns` record
   - Insert `sales_return_items` records
   - For each returned item:
     - Increment batch quantity
     - Calculate return amount
   - Reduce retailer due (if `adjust_due`)
   - Return created return record

3. **Error Handling:**
   - Rollback on any failure
   - Clear error messages
   - Prevent over-returns

---

## 4. FRONTEND PLAN

### UI Components:

1. **Sales Orders List:**
   - Add "View Returns" button per sale
   - Show return count badge if returns exist

2. **Return Modal/Page:**
   - Display original sale items
   - Input fields for return quantity (max = sold - already returned)
   - Reason dropdown/textarea
   - Refund type selector
   - Preview: Return amount, updated due

3. **Return History:**
   - Table showing all returns for a sale
   - Return number, date, amount, reason
   - Items returned breakdown

### State Updates:
- Refresh inventory after return
- Update retailer due display
- Update sale status (if fully returned)

---

## 5. FILE-LEVEL CHANGES

### New Files:
1. `supabase/migrations/YYYYMMDDHHMMSS_create_sales_returns.sql` - Schema migration
2. `distrohub-backend/SALES_RETURN_ANALYSIS.md` - This document

### Modified Files:
1. `app/models.py` - Add SaleReturnCreate, SaleReturn, SaleReturnItem models
2. `app/supabase_db.py` - Add `create_sale_return()`, `get_sale_returns()` methods
3. `app/main.py` - Add return endpoints

### Frontend (Future):
1. `src/pages/Sales.tsx` - Add return button and modal
2. `src/lib/api.ts` - Add return API calls

---

## 6. VERIFICATION CHECKLIST

- [ ] Return creates separate record (not modifies sale)
- [ ] Inventory increases by returned quantity
- [ ] Retailer due decreases by return amount
- [ ] Multiple returns on same sale work correctly
- [ ] Over-return prevented (validation)
- [ ] Full return works (all items)
- [ ] Partial return works (some items)
- [ ] Return history persists after reload
- [ ] Audit trail complete (who, when, why)

---

**Status:** Ready for Implementation

