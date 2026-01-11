# SR Accountability - Quick Reference

## Flow Diagram

```
[UI] Accountability.tsx (Line 49)
  ↓
GET /api/users/{user_id}/accountability
  ↓
[API] main.py:1953-1962 (get_sr_accountability endpoint)
  ↓
[DB] supabase_db.py:2631-2711 (get_sr_accountability function)
  ↓
1. Get user (1 query)
2. Get routes by assigned_to (1 query)
3. Calculate total_expected (⚠️ N+1: 30+ queries for 10 routes)
4. Get reconciliations (⚠️ N+1: 20+ queries for 10 routes)
5. Get route_sale_ids (⚠️ N+1: 30+ queries - duplicate)
6. Get payments (1 query)
7. Calculate totals
  ↓
Return SrAccountability model
  ↓
[UI] Display accountability data
```

---

## Calculation Formulas

### Total Goods Taken (Total Expected Cash)
```
total_expected = Σ (previous_due + current_bill)
  for all sales in all routes assigned to SR

Where:
  previous_due = route_sales.previous_due (frozen snapshot)
  current_bill = sales.total_amount (current sale amount)
```

**Data Sources:**
- `routes.assigned_to` = `user_id` (filters routes)
- `route_sales.previous_due` (snapshot)
- `sales.total_amount` (current)

---

### Total Returns
```
total_returns = Σ route_reconciliations.total_returns_amount
  for all reconciliations of SR's routes
```

**Data Sources:**
- `route_reconciliations.total_returns_amount`

---

### Total Collected
```
total_collected = total_collected_from_recons + total_collected_from_payments

Where:
  total_collected_from_recons = Σ route_reconciliations.total_collected_cash
  total_collected_from_payments = Σ payments.amount
    (where payments.collected_by = user_id AND payments.sale_id in route sales)
```

**Data Sources:**
- `route_reconciliations.total_collected_cash` (manual input during reconciliation)
- `payments.amount` (individual payment records)

**⚠️ Potential Double-Counting:** If reconciliation includes existing payments, they would be counted twice.

---

### Current Outstanding
```
current_outstanding = total_expected - total_collected - total_returns
```

**Current Implementation (WRONG):**
- Shows `users.current_cash_holding` (cash SR is holding)
- Should show: `total_expected - total_collected - total_returns` (amount due from retailers)

---

### Current Cash Holding
```
current_cash_holding = users.current_cash_holding
```

**Meaning:** Cash the SR is currently holding (not yet deposited)

**Update Logic:**
- Updated ONLY in `update_sr_cash_holding()` (Line 2599-2629)
- Called ONLY from `create_route_reconciliation()` (Line 2553-2559)
- Formula: `after_balance = before_balance + total_collected` (from reconciliation)

---

## Data Sources Summary

| Field | Source | Table | Filter |
|-------|--------|-------|--------|
| **Routes** | `routes.assigned_to` | `routes` | `assigned_to = user_id` |
| **Previous Due** | `route_sales.previous_due` | `route_sales` | `route_id IN (route_ids)` |
| **Current Bill** | `sales.total_amount` | `sales` | `id IN (sale_ids)` |
| **Reconciliations** | `route_reconciliations.*` | `route_reconciliations` | `route_id IN (route_ids)` |
| **Returns** | `route_reconciliations.total_returns_amount` | `route_reconciliations` | `route_id IN (route_ids)` |
| **Collected (Recons)** | `route_reconciliations.total_collected_cash` | `route_reconciliations` | `route_id IN (route_ids)` |
| **Collected (Payments)** | `payments.amount` | `payments` | `collected_by = user_id AND sale_id IN (route_sale_ids)` |
| **Cash Holding** | `users.current_cash_holding` | `users` | `id = user_id` |

---

## Workflow Validation

| Rule | Status | Verification |
|------|--------|--------------|
| **SR cash holding updates ONLY during reconciliation** | ✅ | `update_sr_cash_holding()` called only from `create_route_reconciliation()` |
| **Reconciled routes are immutable** | ✅ | Routes included in calculations (read-only) |
| **For sales in routes, SR must be route.assigned_to** | ✅ | Uses `get_routes(assigned_to=user_id)` - filters by route SR |
| **Previous due snapshot stays frozen** | ✅ | Uses `route_sales.previous_due` (snapshot) |

---

## Issues Found

### Critical: **NONE**

### Performance: **3 N+1 Query Problems**
1. Total Expected calculation (Line 2647-2655) - 30+ queries
2. Reconciliations fetch (Line 2657-2661) - 20+ queries
3. Route Sale IDs (Line 2663-2669) - 30+ queries (duplicate)

**Total:** 80+ queries for 10 routes → Should be 5 queries

### Logic: **1 Issue**
4. Current Outstanding shows cash holding instead of actual outstanding (UI Line 156-172)

### Potential: **1 Risk**
5. Double-counting risk if reconciliation includes existing payments (Line 2695-2698)

---

## Quick Fix Summary

**Backend (Performance):**
- Replace N+1 queries with batch queries
- **Impact:** 80+ queries → 5 queries (94% reduction)

**Frontend (Logic):**
- Calculate actual outstanding: `total_expected - total_collected - total_returns`
- **Impact:** Correct calculation displayed

**Total Changes:** ~85 lines  
**Risk:** Low  
**Time:** ~30 minutes

---

## Test Checklist (Quick)

- [ ] SR with no routes → Shows 0s
- [ ] SR with 10 routes → Response < 1s, correct totals
- [ ] SR with reconciled routes → Shows reconciliation history
- [ ] Current Outstanding = Total Expected - Total Collected - Total Returns
- [ ] No double-counting of payments

---

## Files Reference

| Component | File | Lines |
|-----------|------|-------|
| **UI** | `distrohub-frontend/src/pages/Accountability.tsx` | 1-286 |
| **API** | `distrohub-backend/app/main.py` | 1953-1962 |
| **DB** | `distrohub-backend/app/supabase_db.py` | 2631-2711 |
| **Model** | `distrohub-backend/app/models.py` | 643-652 |

---

## Key Takeaways

✅ **Functionally Correct:**
- Uses route SR as source of truth
- Follows workflow rules
- Calculations are logically sound

⚠️ **Performance Issues:**
- N+1 queries cause slow responses
- Needs batch query optimization

🔧 **Logic Fix Needed:**
- Current Outstanding label is misleading
- Should calculate actual outstanding

**Overall:** System works correctly but needs performance optimization and minor logic fix.
