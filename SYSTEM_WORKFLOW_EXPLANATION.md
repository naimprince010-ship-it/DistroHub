# Sales Orders, Routes, and Batches: Complete System Explanation

## Overview

This distribution management system uses **Sales Orders**, **Routes (Batches)**, and **Reconciliation** to manage the complete cycle from order creation to cash collection and end-of-day settlement.

---

## 📊 Database Schema

### Core Tables Relationship:

```
Sales Orders (sales)
    ↓
Routes (routes) ←→ Route Sales (route_sales) [Junction Table with Previous Due Snapshot]
    ↓
Route Reconciliations (route_reconciliations)
    ↓
SR Cash Holdings (sr_cash_holdings)
```

### 1. Sales Orders Table (`sales`)

**Purpose:** Individual customer orders placed by retailers

```sql
CREATE TABLE sales (
    id UUID PRIMARY KEY,
    invoice_number VARCHAR(100),
    retailer_id UUID REFERENCES retailers(id),
    retailer_name VARCHAR(255),
    total_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    due_amount DECIMAL(10,2),
    payment_status VARCHAR(50),  -- 'unpaid', 'partial', 'paid'
    status VARCHAR(50),           -- 'pending', 'confirmed', 'delivered', 'cancelled'
    assigned_to UUID REFERENCES users(id),  -- SR/Delivery Man assigned
    route_id UUID REFERENCES routes(id),    -- Which route this order belongs to
    delivery_date DATE,
    created_at TIMESTAMP
);
```

**Key Fields:**
- `payment_status`: Tracks payment state of individual order
- `assigned_to`: Which SR/Delivery Man is responsible
- `route_id`: Links order to a route (NULL until added to route)

---

### 2. Routes Table (`routes`)

**Purpose:** Groups multiple sales orders together for a specific SR/Delivery Man on a specific day

```sql
CREATE TABLE routes (
    id UUID PRIMARY KEY,
    route_number VARCHAR(100) UNIQUE,
    assigned_to UUID REFERENCES users(id),  -- SR/Delivery Man
    assigned_to_name VARCHAR(255),
    route_date DATE,
    status VARCHAR(50),  -- 'pending', 'in_progress', 'completed', 'reconciled'
    total_orders INTEGER,
    total_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP,
    completed_at TIMESTAMP,
    reconciled_at TIMESTAMP
);
```

**Key Concept:**
- One Route = One SR/Delivery Man's delivery batch for one day
- One Route can contain orders from multiple retailers
- One Route has one status that tracks the entire batch lifecycle

---

### 3. Route Sales Junction Table (`route_sales`)

**Purpose:** Links orders to routes AND stores historical "Previous Due" snapshot

```sql
CREATE TABLE route_sales (
    id UUID PRIMARY KEY,
    route_id UUID REFERENCES routes(id),
    sale_id UUID REFERENCES sales(id),
    previous_due DECIMAL(10,2),  -- SNAPSHOT: Retailer's due at route creation time
    created_at TIMESTAMP,
    UNIQUE(route_id, sale_id)
);
```

**Why Previous Due Snapshot?**
- When creating a route, we calculate each retailer's total outstanding (from OTHER orders)
- This snapshot is FROZEN in `route_sales.previous_due`
- Even if original orders are later modified, the invoice shows the correct historical "Previous Due"
- Formula: `Previous Due (snapshot) + Current Bill (live) = Total Outstanding`

---

### 4. Route Reconciliations Table (`route_reconciliations`)

**Purpose:** End-of-day settlement record for each route

```sql
CREATE TABLE route_reconciliations (
    id UUID PRIMARY KEY,
    route_id UUID REFERENCES routes(id) UNIQUE,
    reconciled_by UUID REFERENCES users(id),  -- Admin who did reconciliation
    total_expected_cash DECIMAL(10,2),  -- Sum of all "Total Outstanding" from invoices
    total_collected_cash DECIMAL(10,2),  -- Actual cash collected
    total_returns_amount DECIMAL(10,2),  -- Value of returned goods
    discrepancy DECIMAL(10,2),  -- expected - collected - returns
    notes TEXT,
    reconciled_at TIMESTAMP
);
```

---

### 5. SR Cash Holdings Table (`sr_cash_holdings`)

**Purpose:** Historical tracking of SR's cash holdings for accountability

```sql
CREATE TABLE sr_cash_holdings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10,2),
    source VARCHAR(50),  -- 'reconciliation', 'manual_adjustment', 'initial'
    reference_id UUID,  -- route_reconciliation_id
    notes TEXT,
    created_at TIMESTAMP
);
```

**Note:** `users.current_cash_holding` is a denormalized field for quick access.

---

## 🔄 Real-Life Workflow

### Phase 1: Order Creation (Sales Team)

**Step 1: Create Sales Order**
- Admin/User creates a sales order for a retailer (e.g., "Rahim Mia")
- Order details: Products, quantities, prices
- Order has `payment_status: 'unpaid'`, `status: 'pending'`
- Optionally assigns an SR: `assigned_to: 'Jahid Islam'`

**Database State:**
```sql
sales: {
    id: 'sale-123',
    retailer_id: 'retailer-abc',
    total_amount: 20000,
    paid_amount: 0,
    due_amount: 20000,
    payment_status: 'unpaid',
    status: 'pending',
    assigned_to: 'jahid-id',
    route_id: NULL  -- Not yet in a route
}
```

---

### Phase 2: Route Planning (Morning - Admin)

**Step 2: Create Route/Batch**
- Admin opens "Routes / Batches" page
- Clicks "+ Create Route"
- Selects:
  - **SR/Delivery Man:** "Jahid Islam" (can auto-suggest from selected orders)
  - **Route Date:** Today's date
  - **Sales Orders:** Selects multiple orders to group together
    - Order 1: Rahim Mia - ৳20,000
    - Order 2: Karim Mia - ৳15,000
    - Order 3: Rahim Mia (again) - ৳10,000

**Step 3: Previous Due Calculation**
- For each retailer, system calculates "Previous Due":
  - Rahim Mia: Sum of all OTHER unpaid orders (not in this route)
  - Karim Mia: Sum of all OTHER unpaid orders (not in this route)
- These values are SNAPSHOTTED in `route_sales.previous_due`

**Database State:**
```sql
routes: {
    id: 'route-456',
    route_number: 'RT-20260111-001',
    assigned_to: 'jahid-id',
    route_date: '2026-01-11',
    status: 'pending',
    total_orders: 3,
    total_amount: 45000
}

route_sales: [
    {route_id: 'route-456', sale_id: 'sale-123', previous_due: 5000},  -- Rahim Mia had ৳5,000 previous due
    {route_id: 'route-456', sale_id: 'sale-124', previous_due: 0},     -- Karim Mia had no previous due
    {route_id: 'route-456', sale_id: 'sale-125', previous_due: 5000}   -- Rahim Mia (same retailer, same snapshot)
]

sales: [
    {id: 'sale-123', route_id: 'route-456', ...},  -- route_id now set
    {id: 'sale-124', route_id: 'route-456', ...},
    {id: 'sale-125', route_id: 'route-456', ...}
]
```

**Step 4: Batch Load Sheet**
- Admin prints "Batch Load Sheet" for the route
- Contains all orders grouped by retailer
- Shows: Previous Due + Current Bill = Total Outstanding
- This is the delivery document SR takes in the morning

---

### Phase 3: Delivery (SR/Delivery Man)

**Step 5: Route Status → 'in_progress'**
- When SR starts delivery, route status changes to `'in_progress'`
- (This can be manual or automatic when first invoice is printed)

**Step 6: Delivery & Collection**
- SR visits each retailer
- Delivers goods (updates `sales.status` to `'delivered'`)
- Collects payment:
  - Uses "টাকা জমা" (Collect Money) button to record payment
  - Creates `Payment` record with `collected_by: 'jahid-id'`
  - Updates `sales.paid_amount` and `payment_status`
  - **Note:** Payment updates `sales.paid_amount` but does NOT update SR's `current_cash_holding` yet (only reconciliation does)

**Database State:**
```sql
payments: [
    {
        id: 'pay-789',
        sale_id: 'sale-123',
        amount: 25000,  -- Collected ৳25,000 (Previous Due 5,000 + Current 20,000)
        collected_by: 'jahid-id',
        payment_method: 'cash'
    }
]

sales: {
    id: 'sale-123',
    paid_amount: 25000,
    due_amount: 0,
    payment_status: 'paid'
}
```

**Step 7: Returns Handling**
- If retailer returns some items:
  - Uses Sales Returns feature
  - Reduces the current bill amount
  - Returns are tracked separately

**Step 8: Route Status → 'completed'**
- When SR finishes all deliveries, route status changes to `'completed'`
- All orders are delivered (or partially delivered)
- SR returns to office with collected cash

---

### Phase 4: End-of-Day Reconciliation (Evening - Admin)

**Step 9: Reconciliation Process**
- Admin opens "Routes / Batches" page
- Finds completed route (status: `'completed'`)
- Clicks "Reconcile" button
- Opens "Quick Reconciliation" screen

**Step 10: Reconciliation Input**
- Admin manually enters:
  - **Returned Quantities:** For each item returned (updates current bill)
  - **Collected Cash:** Total cash SR handed over
- System calculates:
  - `total_expected_cash`: Sum of all "Total Outstanding" from invoices
  - `total_collected_cash`: Admin input
  - `total_returns_amount`: Calculated from returns
  - `discrepancy`: expected - collected - returns

**Step 11: Update SR Cash Holding**
- **Only during reconciliation**, SR's `current_cash_holding` is updated:
  ```sql
  -- Update SR's current cash holding
  users: {
      id: 'jahid-id',
      current_cash_holding: 25000  -- Updated from reconciliation
  }
  
  sr_cash_holdings: [
      {
          user_id: 'jahid-id',
          amount: 25000,
          source: 'reconciliation',
          reference_id: 'recon-abc'
      }
  ]
  ```

**Step 12: Route Status → 'reconciled'**
- After reconciliation, route status changes to `'reconciled'`
- Route is closed and archived
- SR's accountability is updated

---

## 📈 Status Transitions

### Sales Order Status Flow:

```
[pending] → [confirmed] → [delivered] → [cancelled]
     ↓            ↓
  (Order)    (Ready to      (Goods       (Cancelled
  Created)    deliver)      delivered)    order)
```

**Status Meanings:**
- `pending`: Order created, not yet confirmed
- `confirmed`: Order confirmed, ready for delivery
- `delivered`: Goods delivered to retailer
- `cancelled`: Order cancelled

---

### Payment Status Flow:

```
[unpaid] → [partial] → [paid]
    ↓          ↓
  (No      (Some      (Fully
  payment)  payment)   paid)
```

**Status Meanings:**
- `unpaid`: No payment received
- `partial`: Partial payment received
- `paid`: Fully paid

---

### Route Status Flow:

```
[pending] → [in_progress] → [completed] → [reconciled]
     ↓            ↓              ↓              ↓
  (Route    (SR on      (All deliveries  (End-of-day
  created)  delivery)   finished)        settlement done)
```

**Status Meanings:**
- `pending`: Route created, not yet started
- `in_progress`: SR is currently on delivery route
- `completed`: All deliveries finished, SR returned
- `reconciled`: End-of-day reconciliation completed, route closed

**Status Transition Rules:**
1. `pending` → `in_progress`: When SR starts delivery (can be automatic or manual)
2. `in_progress` → `completed`: When all orders are delivered (or marked as such)
3. `completed` → `reconciled`: After admin performs reconciliation
4. **Once `reconciled`, route cannot be changed** (archived)

---

## 💡 Key Concepts

### 1. Smart Invoices with Previous Due

**Invoice Formula:**
```
Previous Due (Snapshot) + Current Bill (Live) = Total Outstanding
```

**Example:**
- Rahim Mia has 3 orders:
  - Order A: ৳5,000 (old, unpaid) - NOT in route
  - Order B: ৳20,000 (current) - IN route
  - Order C: ৳10,000 (current) - IN route

**When Route Created:**
- Previous Due Snapshot: ৳5,000 (from Order A)
- Current Bill for Route: ৳30,000 (Order B + C)

**Invoice Shows:**
- Previous Due: ৳5,000 (frozen)
- Current Bill: ৳30,000 (live)
- **Total Outstanding: ৳35,000**

**Even if Order A is later modified**, invoice still shows ৳5,000 as Previous Due (historical accuracy).

---

### 2. SR Accountability

**SR Accountability Components:**
1. **Routes Assigned:** All routes where `assigned_to = SR's ID`
2. **Total Collected:**
   - From `route_reconciliations.total_collected_cash` (reconciled routes)
   - From `payments.amount` where `collected_by = SR's ID` (individual payments for routes)
3. **Current Cash Holding:** `users.current_cash_holding` (updated only during reconciliation)

**Accountability Formula:**
```
Total Goods Taken = Sum of all route amounts
Total Returned = Sum of all returns
Total Collected = Sum of all collected cash
Current Outstanding = Goods Taken - Returned - Collected
Current Cash Holding = Cash currently with SR (from reconciliation)
```

---

### 3. Reconciliation Importance

**Why Reconciliation is Separate from Payment Collection:**
- Payments can be collected throughout the day
- Reconciliation happens once at end-of-day
- Reconciliation validates:
  - Expected cash vs. Actual cash collected
  - Returns and adjustments
  - SR accountability and cash holding

**Reconciliation Updates:**
- ✅ SR's `current_cash_holding`
- ✅ Route status to `reconciled`
- ✅ Returns and adjustments
- ✅ Discrepancy tracking

**Payment Collection (during delivery) Updates:**
- ✅ `sales.paid_amount`
- ✅ `sales.payment_status`
- ✅ Creates `Payment` record
- ❌ Does NOT update SR's `current_cash_holding` (to avoid double-counting)

---

## 📋 Complete Example Scenario

### Day: January 11, 2026

**Morning (9:00 AM) - Admin:**
1. Creates Route RT-20260111-001 for SR "Jahid Islam"
2. Adds 3 orders:
   - Rahim Mia: ৳20,000 (Previous Due: ৳5,000)
   - Karim Mia: ৳15,000 (Previous Due: ৳0)
   - Rahim Mia: ৳10,000 (Previous Due: ৳5,000 - same snapshot)
3. Prints Batch Load Sheet
4. Route Status: `pending`

**Midday (10:00 AM) - SR:**
1. Receives Batch Load Sheet
2. Route Status: `pending` → `in_progress`
3. Starts delivery

**Afternoon (2:00 PM) - SR:**
1. Visits Rahim Mia:
   - Delivers goods (Order 1 & 3)
   - Collects ৳35,000 (Total Outstanding: ৳5,000 + ৳30,000)
   - Records payment via "টাকা জমা" button
2. Visits Karim Mia:
   - Delivers goods
   - Collects ৳15,000
   - Records payment
3. Returns some items from Rahim Mia (value: ৳2,000)
4. Route Status: `in_progress` → `completed`

**Evening (6:00 PM) - Admin:**
1. Opens Reconciliation for Route RT-20260111-001
2. Enters:
   - Total Collected Cash: ৳48,000 (৳35,000 + ৳15,000 - ৳2,000 returns)
   - Returns: ৳2,000 worth of goods
3. System calculates:
   - Expected: ৳50,000 (৳35,000 + ৳15,000)
   - Collected: ৳48,000
   - Returns: ৳2,000
   - Discrepancy: ৳0 ✅
4. Route Status: `completed` → `reconciled`
5. SR's `current_cash_holding`: Updated to ৳48,000

**Result:**
- All orders delivered and paid
- SR accountability updated
- Route closed and archived
- Ready for next day

---

## 🎯 Summary

**Sales Orders:** Individual customer orders (the "what")

**Routes/Batches:** Grouped orders for one SR on one day (the "who" and "when")

**Reconciliation:** End-of-day settlement and accountability (the "how much")

**Together they provide:**
- ✅ Organized delivery management
- ✅ SR accountability and cash tracking
- ✅ Historical accuracy (Previous Due snapshots)
- ✅ Complete audit trail
- ✅ Efficient batch processing
