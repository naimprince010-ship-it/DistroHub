# Routes/Batches Module - Implementation Summary

## Module Overview

Routes/Batches module manages grouping of sales orders for SR/Delivery Man delivery and end-of-day reconciliation.

---

## Current Implementation Status

### ✅ Core Features Implemented

1. **Route Creation (`create_route`)**
   - **File:** `distrohub-backend/app/supabase_db.py:2084`
   - **Endpoint:** `POST /api/routes` (`distrohub-backend/app/main.py:1770`)
   - **Functionality:**
     - ✅ Creates route from selected sales orders
     - ✅ Calculates previous_due snapshot for each retailer
     - ✅ Writes `previous_due` to `route_sales.previous_due` (frozen snapshot)
     - ✅ Sets route status to `'pending'` on creation
     - ✅ Links sales to route via `route_sales` junction table

2. **Previous Due Snapshot**
   - **File:** `distrohub-backend/app/supabase_db.py:2108-2143`
   - **Functionality:**
     - ✅ Calculates previous due for each retailer (excluding sales being added to route)
     - ✅ Stores snapshot in `route_sales.previous_due` at route creation
     - ✅ Also calculates when adding sales to existing route (`add_sales_to_route:2274-2284`)

3. **Route Status Transitions** ✅ NOW VALIDATED
   - **File:** `distrohub-backend/app/supabase_db.py:2230-2260`
   - **Valid Flow:** `pending → in_progress → completed → reconciled`
   - **Validation:**
     - ✅ Added `_validate_route_status_transition` helper function
     - ✅ Validates transitions follow correct flow
     - ✅ Prevents invalid status jumps (e.g., `pending → reconciled` not allowed)
     - ✅ Prevents transitions from `reconciled` (immutable)

4. **Route Immutability (Reconciled Routes)**
   - **File:** `distrohub-backend/app/supabase_db.py:2230` (`_check_route_not_reconciled`)
   - **Protected Functions:**
     - ✅ `update_route` - prevents updates to reconciled routes
     - ✅ `add_sales_to_route` - prevents adding sales to reconciled routes
     - ✅ `remove_sale_from_route` - prevents removing sales from reconciled routes
     - ✅ `delete_route` - prevents deletion of reconciled routes

---

## Route Status Flow & Validation

### Valid Status Transitions:

```
[pending] → [in_progress] → [completed] → [reconciled]
```

**Rules:**
- ✅ `pending` → `in_progress` (allowed)
- ✅ `in_progress` → `completed` (allowed)
- ✅ `completed` → `reconciled` (allowed - set by reconciliation)
- ❌ `pending` → `completed` (NOT allowed)
- ❌ `pending` → `reconciled` (NOT allowed)
- ❌ `in_progress` → `reconciled` (NOT allowed)
- ❌ `reconciled` → any status (NOT allowed - immutable)

---

## API Endpoints

### Route CRUD Operations

1. **POST `/api/routes`** - Create route
   - Creates route with selected sales
   - Writes previous_due snapshots
   - Status: `pending`

2. **GET `/api/routes`** - List routes
   - Optional filters: `assigned_to`, `status`, `route_date`

3. **GET `/api/routes/{route_id}`** - Get route details
   - Returns route with all sales and previous_due snapshots

4. **PUT `/api/routes/{route_id}`** - Update route
   - ✅ Validates status transitions
   - ✅ Blocks updates to reconciled routes

5. **POST `/api/routes/{route_id}/sales`** - Add sales to route
   - ✅ Calculates previous_due for new sales
   - ✅ Blocks if route is reconciled

6. **DELETE `/api/routes/{route_id}/sales/{sale_id}`** - Remove sale from route
   - ✅ Blocks if route is reconciled

7. **DELETE `/api/routes/{route_id}`** - Delete route
   - ✅ Blocks if route is reconciled

### Reconciliation Endpoints

8. **POST `/api/routes/{route_id}/reconcile`** - Create reconciliation
   - Sets route status to `reconciled`
   - Updates SR cash holding

---

## Key Functions

### `create_route` (line 2084)
```python
def create_route(self, data: dict, sale_ids: List[str]) -> dict:
    # 1. Validates assigned_to user
    # 2. Generates route_number
    # 3. Calculates previous_due for each retailer (snapshot)
    # 4. Creates route with status='pending'
    # 5. Creates route_sales records with previous_due snapshots
    # 6. Updates sales.route_id
```

**Previous Due Calculation:**
- Gets all unpaid/partial orders for retailer (excluding sales being added)
- Calculates total due from other orders
- Stores in `route_sales.previous_due` (frozen)

### `update_route` (line 2245)
```python
def update_route(self, route_id: str, data: dict) -> Optional[dict]:
    # 1. Gets route
    # 2. Checks if reconciled (immutable check)
    # 3. Validates status transition if status changed
    # 4. Updates route
```

**Status Transition Validation:**
- `_validate_route_status_transition` ensures valid flow
- Prevents invalid jumps (e.g., pending → reconciled)
- Prevents transitions from reconciled

### `create_route_reconciliation` (line 2367)
```python
def create_route_reconciliation(self, route_id: str, data: dict, user_id: Optional[str] = None) -> dict:
    # 1. Gets route
    # 2. Calculates total_expected_cash
    # 3. Creates reconciliation record
    # 4. Creates reconciliation items (returns)
    # 5. Updates SR cash holding
    # 6. Sets route status to 'reconciled'
```

---

## Database Schema

### Routes Table
```sql
CREATE TABLE routes (
    id UUID PRIMARY KEY,
    route_number VARCHAR(100) UNIQUE,
    assigned_to UUID REFERENCES users(id),
    assigned_to_name VARCHAR(255),
    route_date DATE,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, completed, reconciled
    total_orders INTEGER,
    total_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP,
    completed_at TIMESTAMP,
    reconciled_at TIMESTAMP
);
```

### Route Sales Junction Table
```sql
CREATE TABLE route_sales (
    id UUID PRIMARY KEY,
    route_id UUID REFERENCES routes(id),
    sale_id UUID REFERENCES sales(id),
    previous_due DECIMAL(10,2) DEFAULT 0,  -- SNAPSHOT: Frozen at route creation
    created_at TIMESTAMP,
    UNIQUE(route_id, sale_id)
);
```

---

## Validation & Guards

### Status Transition Validation

**Function:** `_validate_route_status_transition(current_status, new_status)`

**Rules:**
- Only allows transitions: `pending → in_progress → completed → reconciled`
- Raises `ValueError` with descriptive message for invalid transitions
- Prevents transitions from `reconciled` (immutable)

**Example Error:**
```
ValueError: Cannot transition route from 'pending' to 'reconciled'. 
Valid next statuses: in_progress
```

### Reconciled Route Immutability

**Function:** `_check_route_not_reconciled(route)`

**Rules:**
- Raises `ValueError("Cannot modify reconciled route")` if route is reconciled
- Called in all route modification functions:
  - `update_route`
  - `add_sales_to_route`
  - `remove_sale_from_route`
  - `delete_route`

---

## Testing Checklist

### Route Creation
- [ ] Create route with multiple sales orders
- [ ] Verify `previous_due` snapshot written to `route_sales.previous_due`
- [ ] Verify route status is `'pending'`
- [ ] Verify `sales.route_id` is set

### Status Transitions
- [ ] `pending` → `in_progress` ✅ (should work)
- [ ] `in_progress` → `completed` ✅ (should work)
- [ ] `completed` → `reconciled` ✅ (should work via reconciliation)
- [ ] `pending` → `completed` ❌ (should fail)
- [ ] `pending` → `reconciled` ❌ (should fail)
- [ ] `in_progress` → `reconciled` ❌ (should fail)

### Route Immutability
- [ ] Try to update reconciled route ❌ (should fail)
- [ ] Try to add sales to reconciled route ❌ (should fail)
- [ ] Try to remove sales from reconciled route ❌ (should fail)
- [ ] Try to delete reconciled route ❌ (should fail)

---

## Files Modified

### Backend
- `distrohub-backend/app/supabase_db.py`
  - Added `_validate_route_status_transition` (status transition validation)
  - Enhanced `update_route` with status transition validation
  - All route modification functions protected with `_check_route_not_reconciled`

### API Endpoints
- `distrohub-backend/app/main.py`
  - Route endpoints handle `ValueError` with 400 Bad Request

---

## Commit Details

**Latest Commit:** Route immutability + status transition validation
**Files Changed:** `distrohub-backend/app/supabase_db.py`
**Lines Changed:** ~35 lines (status validation + existing immutability checks)

---

## Summary

✅ **Route Creation:** Creates routes from selected sales, writes previous_due snapshots
✅ **Status Transitions:** Validated to follow `pending → in_progress → completed → reconciled`
✅ **Route Immutability:** Reconciled routes are locked (cannot be modified/deleted)
✅ **Previous Due Snapshot:** Correctly written to `route_sales.previous_due` at route creation

**All requirements met!** 🎯
