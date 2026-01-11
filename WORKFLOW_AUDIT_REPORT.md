# Workflow Alignment Audit Report

## Required Workflow

1. **Sales Orders (sales)** - Individual customer orders
2. **Routes (routes)** - Groups multiple sales orders for SR/Delivery Man on one day
3. **route_sales junction** - Links orders to routes with `previous_due` snapshot (frozen)
4. **Payment Collection** - Updates `sales` table only, does NOT update SR cash holding
5. **SR Cash Holding** - Updates ONLY during end-of-day reconciliation
6. **Reconciled Routes** - Must become immutable (cannot be modified/deleted)

---

## Audit Findings

### ✅ CORRECT Implementations

1. **Payment Collection (`create_payment`)**
   - **File:** `distrohub-backend/app/supabase_db.py:1310`
   - **Status:** ✅ CORRECT
   - **Findings:**
     - Updates `sales.paid_amount`, `sales.due_amount`, `sales.payment_status` only
     - Does NOT call `update_sr_cash_holding`
     - Comment confirms: "Cash holding is updated during reconciliation, not individual payments"
   - **Code Reference:**
     ```python
     # Line 1351-1352: Comment confirms correct behavior
     # Note: Cash holding is updated during reconciliation, not individual payments
     # Individual payments are just records. Reconciliation is the source of truth.
     ```

2. **Reconciliation Updates SR Cash Holding (`create_route_reconciliation`)**
   - **File:** `distrohub-backend/app/supabase_db.py:2346`
   - **Status:** ✅ CORRECT
   - **Findings:**
     - Calls `update_sr_cash_holding` during reconciliation (line 2396)
     - Updates route status to `'reconciled'` (line 2399-2402)
     - Correctly implements workflow requirement
   - **Code Reference:**
     ```python
     # Line 2394-2396: Updates SR cash holding during reconciliation
     if route.get("assigned_to"):
         self.update_sr_cash_holding(route["assigned_to"], total_collected, "reconciliation", reconciliation_id)
     ```

3. **Previous Due Snapshot (`create_route`, `add_sales_to_route`)**
   - **File:** `distrohub-backend/app/supabase_db.py:2084` (create_route), `2250` (add_sales_to_route)
   - **Status:** ✅ CORRECT
   - **Findings:**
     - `create_route` calculates previous due and stores in `route_sales.previous_due` (line 2143)
     - `add_sales_to_route` also calculates and stores previous due snapshot (line 2284)
     - Both functions correctly snapshot previous due at route creation/addition time

---

### ❌ BUGS & GAPS

#### **BUG #1: Route Immutability - `update_route` allows updates to reconciled routes**

**File:** `distrohub-backend/app/supabase_db.py:2230` (`update_route`)
**Endpoint:** `PUT /api/routes/{route_id}` (`distrohub-backend/app/main.py:1803`)

**Issue:**
- `update_route` function does NOT check if route status is `'reconciled'`
- Allows updates to reconciled routes (should be immutable)
- Can change status, notes, etc. on reconciled routes

**Current Code:**
```python
def update_route(self, route_id: str, data: dict) -> Optional[dict]:
    """Update route (status, notes, etc.)"""
    update_data = {}
    
    if "status" in data:
        update_data["status"] = data["status"]
        # ... updates without checking if route is reconciled
    
    result = self.client.table("routes").update(update_data).eq("id", route_id).execute()
    return result.data[0] if result.data else None
```

**Required Fix:**
- Add check at beginning: if route status is `'reconciled'`, raise `ValueError("Cannot modify reconciled route")`
- Prevent any updates to reconciled routes

---

#### **BUG #2: Route Immutability - `add_sales_to_route` allows adding sales to reconciled routes**

**File:** `distrohub-backend/app/supabase_db.py:2250` (`add_sales_to_route`)
**Endpoint:** `POST /api/routes/{route_id}/sales` (`distrohub-backend/app/main.py:1815`)

**Issue:**
- `add_sales_to_route` function does NOT check if route status is `'reconciled'`
- Allows adding sales orders to reconciled routes (should be immutable)
- Can modify route contents after reconciliation

**Current Code:**
```python
def add_sales_to_route(self, route_id: str, sale_ids: List[str]) -> dict:
    """Add sales orders to an existing route"""
    route = self.get_route(route_id)
    if not route:
        raise ValueError("Route not found")
    
    # Missing: Check if route.status == 'reconciled'
    # ... continues to add sales without immutability check
```

**Required Fix:**
- Add check after getting route: if route status is `'reconciled'`, raise `ValueError("Cannot add sales to reconciled route")`
- Prevent adding sales to reconciled routes

---

#### **BUG #3: Route Immutability - `remove_sale_from_route` allows removing sales from reconciled routes**

**File:** `distrohub-backend/app/supabase_db.py:2312` (`remove_sale_from_route`)
**Endpoint:** `DELETE /api/routes/{route_id}/sales/{sale_id}` (`distrohub-backend/app/main.py:1830`)

**Issue:**
- `remove_sale_from_route` function does NOT check if route status is `'reconciled'`
- Allows removing sales orders from reconciled routes (should be immutable)
- Can modify route contents after reconciliation

**Current Code:**
```python
def remove_sale_from_route(self, route_id: str, sale_id: str) -> dict:
    """Remove a sale from route"""
    route = self.get_route(route_id)
    if not route:
        raise ValueError("Route not found")
    
    # Missing: Check if route.status == 'reconciled'
    # ... continues to remove sale without immutability check
```

**Required Fix:**
- Add check after getting route: if route status is `'reconciled'`, raise `ValueError("Cannot remove sales from reconciled route")`
- Prevent removing sales from reconciled routes

---

#### **BUG #4: Route Immutability - `delete_route` should prevent deletion of reconciled routes**

**File:** `distrohub-backend/app/supabase_db.py` (need to find `delete_route`)
**Endpoint:** `DELETE /api/routes/{route_id}` (`distrohub-backend/app/main.py:1842`)

**Issue:**
- `delete_route` function may NOT check if route status is `'reconciled'`
- Allows deletion of reconciled routes (should be immutable/archived)
- Should prevent deletion of reconciled routes for audit trail

**Required Fix:**
- Add check: if route status is `'reconciled'`, raise `ValueError("Cannot delete reconciled route")`
- Prevent deletion of reconciled routes (they should be archived, not deleted)

---

## Summary of Required Fixes

| # | Function | File | Issue | Priority |
|---|----------|------|-------|----------|
| 1 | `update_route` | `supabase_db.py:2230` | Missing reconciled route check | **HIGH** |
| 2 | `add_sales_to_route` | `supabase_db.py:2250` | Missing reconciled route check | **HIGH** |
| 3 | `remove_sale_from_route` | `supabase_db.py:2312` | Missing reconciled route check | **HIGH** |
| 4 | `delete_route` | `supabase_db.py` (TBD) | Missing reconciled route check | **HIGH** |

---

## Proposed Fix Strategy

### Minimal Code Changes

1. **Add helper function** to check route immutability:
   ```python
   def _check_route_not_reconciled(self, route: dict) -> None:
       """Raise ValueError if route is reconciled (immutable)"""
       if route.get("status") == "reconciled":
           raise ValueError("Cannot modify reconciled route")
   ```

2. **Add checks to all route modification functions:**
   - `update_route`: Check before updating
   - `add_sales_to_route`: Check after getting route
   - `remove_sale_from_route`: Check after getting route
   - `delete_route`: Check after getting route (if exists)

3. **Update API endpoints** to handle `ValueError` with proper HTTP status (400 Bad Request)

---

## Implementation Plan

1. ✅ Audit complete - identified 4 bugs
2. ⏳ Add helper function `_check_route_not_reconciled`
3. ⏳ Fix `update_route` - add immutability check
4. ⏳ Fix `add_sales_to_route` - add immutability check
5. ⏳ Fix `remove_sale_from_route` - add immutability check
6. ⏳ Fix `delete_route` - add immutability check (if function exists)
7. ⏳ Test all fixes
