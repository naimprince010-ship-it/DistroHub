# Route SR Override Implementation - Final Summary

## ✅ Implementation Complete

All required changes implemented with minimal code modifications. Route SR now overrides Sales SR when sales are added to routes.

---

## Files Changed (Exact Diffs)

### 1. Backend: `distrohub-backend/app/supabase_db.py`

#### Change #1: `create_route()` - Override Sales SR

**Location:** Line 2173-2183

**Diff:**
```python
# Create route_sales records with previous_due snapshots
for rs_data in route_sales_data:
    route_sale_data = {
        "route_id": route_id,
        "sale_id": rs_data["sale_id"],
        "previous_due": rs_data["previous_due"]
    }
    self.client.table("route_sales").insert(route_sale_data).execute()
    
-   # Update sale.route_id
-   self.client.table("sales").update({"route_id": route_id}).eq("id", rs_data["sale_id"]).execute()
+   # Update sale.route_id AND override sales.assigned_to to match route (Route SR overrides Sales SR)
+   self.client.table("sales").update({
+       "route_id": route_id,
+       "assigned_to": data["assigned_to"],  # Route's SR
+       "assigned_to_name": assigned_user.get("name")  # Route's SR name
+   }).eq("id", rs_data["sale_id"]).execute()
```

**Lines Changed:** 3 lines modified

---

#### Change #2: `add_sales_to_route()` - Override Sales SR + Guard

**Location:** Line 2303-2369

**Diff:**
```python
def add_sales_to_route(self, route_id: str, sale_ids: List[str]) -> dict:
    """Add sales orders to an existing route"""
    route = self.get_route(route_id)
    if not route:
        raise ValueError("Route not found")
    
+   # Check if route is immutable (completed or reconciled)
+   route_status = route.get("status")
+   if route_status in ["completed", "reconciled"]:
+       raise ValueError(f"Cannot add sales to route with status '{route_status}'. Route is immutable.")
+   
+   self._check_route_not_reconciled(route)
+   
+   # Get route's SR info for override
+   route_sr_id = route.get("assigned_to")
+   route_sr_name = route.get("assigned_to_name")
+   
    # Calculate previous due for new sales
    ...
    
    # Add route_sales records
    for rs_data in route_sales_data:
        route_sale_data = {
            "route_id": route_id,
            "sale_id": rs_data["sale_id"],
            "previous_due": rs_data["previous_due"]
        }
        self.client.table("route_sales").insert(route_sale_data).execute()
-       self.client.table("sales").update({"route_id": route_id}).eq("id", rs_data["sale_id"]).execute()
+       
+       # Update sale.route_id AND override sales.assigned_to to match route (Route SR overrides Sales SR)
+       update_data = {"route_id": route_id}
+       if route_sr_id:
+           update_data["assigned_to"] = route_sr_id
+           update_data["assigned_to_name"] = route_sr_name
+       
+       self.client.table("sales").update(update_data).eq("id", rs_data["sale_id"]).execute()
```

**Lines Changed:** ~12 lines added/modified

---

#### Change #3: `remove_sale_from_route()` - Add Guard

**Location:** Line 2377-2387

**Diff:**
```python
def remove_sale_from_route(self, route_id: str, sale_id: str) -> dict:
    """Remove a sale from route"""
-   # Check if route is reconciled (immutable)
    route = self.get_route(route_id)
    if not route:
        raise ValueError("Route not found")
    
-   self._check_route_not_reconciled(route)
+   # Check if route is immutable (completed or reconciled)
+   route_status = route.get("status")
+   if route_status in ["completed", "reconciled"]:
+       raise ValueError(f"Cannot remove sales from route with status '{route_status}'. Route is immutable.")
+   
+   self._check_route_not_reconciled(route)
```

**Lines Changed:** ~5 lines modified

---

#### Change #4: `get_sales_report()` - Add Effective SR Field

**Location:** Line 863-890

**Diff:**
```python
+   # Build sales report with return data
+   # For sales in routes, use route's SR (Route SR overrides Sales SR)
+   # Get route info for sales that have route_id
+   route_ids = set(sale.get("route_id") for sale in sales if sale.get("route_id"))
+   routes_map = {}
+   if route_ids:
+       for route_id in route_ids:
+           route = self.get_route(route_id)
+           if route:
+               routes_map[route_id] = {
+                   "assigned_to": route.get("assigned_to"),
+                   "assigned_to_name": route.get("assigned_to_name")
+               }
+   
    sales_report = []
    total_gross = 0.0
    total_returned_items = 0
    
    for sale in sales:
        sale_id = sale["id"]
        sale["payment_status"] = PaymentStatus(sale["payment_status"]) if sale.get("payment_status") else PaymentStatus.DUE
        sale["status"] = OrderStatus(sale["status"]) if sale.get("status") else OrderStatus.PENDING
        
+       # If sale is in a route, use route's SR for reporting (Route SR overrides Sales SR)
+       route_id = sale.get("route_id")
+       if route_id and route_id in routes_map:
+           route_info = routes_map[route_id]
+           sale["effective_assigned_to"] = route_info["assigned_to"]  # Route's SR
+           sale["effective_assigned_to_name"] = route_info["assigned_to_name"]
+       else:
+           # Sale not in route, use sale's SR
+           sale["effective_assigned_to"] = sale.get("assigned_to")
+           sale["effective_assigned_to_name"] = sale.get("assigned_to_name")
+       
        # Get sale items
        items_result = self.client.table("sale_items").select("*").eq("sale_id", sale_id).execute()
        sale["items"] = items_result.data or []
```

**Lines Changed:** ~20 lines added

---

#### Change #5: `get_collection_report()` - Use Route SR for Completeness

**Location:** Line 1003-1040

**Diff:**
```python
            # Get all sales assigned to this SR
-           sales_query = self.client.table("sales").select("*").eq("assigned_to", sr_id)
+           # Note: After Route SR override implementation, sales.assigned_to should already match route SR
+           # But we also check routes to ensure completeness
+           sales_query = self.client.table("sales").select("*").eq("assigned_to", sr_id)
            ...
            assigned_sales = sales_result.data or []
            
+           # Also include sales from routes assigned to this SR (Route SR is source of truth)
+           # This ensures we catch all sales that belong to this SR's routes
+           routes_result = self.client.table("routes").select("id").eq("assigned_to", sr_id).execute()
+           route_ids = [r["id"] for r in (routes_result.data or [])]
+           
+           if route_ids:
+               # Get all sales in these routes
+               for route_id in route_ids:
+                   route_sales_result = self.client.table("route_sales").select("sale_id").eq("route_id", route_id).execute()
+                   route_sale_ids = [rs["sale_id"] for rs in (route_sales_result.data or [])]
+                   
+                   # Fetch these sales and add to assigned_sales if not already included
+                   for sale_id in route_sale_ids:
+                       if not any(s.get("id") == sale_id for s in assigned_sales):
+                           sale = self.get_sale(sale_id)
+                           if sale:
+                               # Apply date filters
+                               sale_date = sale.get("created_at", "")
+                               if from_date and sale_date < from_date:
+                                   continue
+                               if to_date:
+                                   end_datetime = datetime.fromisoformat(to_date.replace('Z', '+00:00')) + timedelta(days=1)
+                                   if sale_date >= end_datetime.isoformat():
+                                       continue
+                               assigned_sales.append(sale)
```

**Lines Changed:** ~25 lines added

---

### 2. Frontend: `distrohub-frontend/src/pages/Sales.tsx`

#### Change #1: Add `route_id` to SalesOrder Interface

**Location:** Line 31-47

**Diff:**
```typescript
interface SalesOrder {
  id: string;
  order_number: string;
  retailer_name: string;
  retailer_id?: string;
  order_date: string;
  delivery_date: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  total_amount: number;
  paid_amount: number;
  items: { product: string; qty: number; price: number }[];
  delivery_status?: 'pending' | 'delivered' | 'partially_delivered' | 'returned';
  assigned_to?: string;
  assigned_to_name?: string;
+ route_id?: string;  // Route ID if sale is in a route
  payments?: Payment[];
}
```

**Lines Changed:** 1 line added

---

#### Change #2: Map `route_id` from Backend

**Location:** Line 136-138

**Diff:**
```typescript
            delivery_status: sale.delivery_status || 'pending',
            assigned_to: sale.assigned_to || undefined,
            assigned_to_name: sale.assigned_to_name || undefined,
+           route_id: sale.route_id || undefined,
          };
```

**Lines Changed:** 1 line added

---

#### Change #3: ChallanPrintWrapper - Use Route SR When Available

**Location:** Line 511-605

**Diff:**
```typescript
function ChallanPrintWrapper({ 
  order, 
  onClose 
}: { 
  order: SalesOrder; 
  onClose: () => void;
}) {
- const [srPhone, setSrPhone] = useState<string | null>(null);
+ const [srPhone, setSrPhone] = useState<string | null>(null);
+ const [srName, setSrName] = useState<string | null>(null);
+ const [srId, setSrId] = useState<string | null>(null);
  const [returnItems, setReturnItems] = useState<Array<{sale_item_id: string; quantity_returned: number; product_name: string}>>([]);

  useEffect(() => {
    const fetchData = async () => {
-     // Fetch SR phone
-     if (order.assigned_to) {
+     // Priority: If sale is in a route, use route's SR. Otherwise use sale's SR.
+     let targetSrId: string | null = null;
+     let targetSrName: string | null = null;
+     
+     if (order.route_id) {
+       // Sale is in a route - fetch route to get route's SR
+       try {
+         const routeRes = await api.get(`/api/routes/${order.route_id}`);
+         if (routeRes.data) {
+           targetSrId = routeRes.data.assigned_to || null;
+           targetSrName = routeRes.data.assigned_to_name || null;
+         }
+       } catch (error) {
+         console.error('[ChallanPrintWrapper] Error fetching route:', error);
+         // Fallback to sale's SR if route fetch fails
+         targetSrId = order.assigned_to || null;
+         targetSrName = order.assigned_to_name || null;
+       }
+     } else {
+       // Sale not in route - use sale's SR
+       targetSrId = order.assigned_to || null;
+       targetSrName = order.assigned_to_name || null;
+     }
+     
+     setSrId(targetSrId);
+     setSrName(targetSrName);
+     
+     // Fetch SR phone
+     if (targetSrId) {
        try {
          const usersRes = await api.get('/api/users');
-         const sr = usersRes.data?.find((u: any) => u.id === order.assigned_to);
+         const sr = usersRes.data?.find((u: any) => u.id === targetSrId);
          if (sr?.phone) {
            setSrPhone(sr.phone);
          }
        } catch (error) {
          console.error('[ChallanPrintWrapper] Error fetching SR phone:', error);
        }
      }
      ...
    };
    fetchData();
- }, [order.assigned_to, order.id]);
+ }, [order.assigned_to, order.route_id, order.id]);
  ...
        distributor_name: 'DistroHub',
        route_name: 'Main Route',
-       sr_name: order.assigned_to_name || 'Sales Representative',
-       sr_id: order.assigned_to,
+       sr_name: srName || order.assigned_to_name || 'Sales Representative',
+       sr_id: srId || order.assigned_to,
        sr_phone: srPhone || undefined,
```

**Lines Changed:** ~25 lines modified

---

### 3. Frontend: `distrohub-frontend/src/pages/Routes.tsx`

#### Change #1: Add Warning for Multiple Assigned To Values

**Location:** Line 372-394, 450-467

**Diff:**
```typescript
    // Auto-suggest SR from selected sales (if all selected sales have the same assigned_to)
-   if (formData.sale_ids.length > 0 && !formData.assigned_to) {
+   // Also check for multiple assigned_to values to show warning
+   if (formData.sale_ids.length > 0) {
      const selectedSales = formData.sale_ids
        .map(saleId => availableSales.find(s => s.id === saleId))
        .filter(Boolean) as typeof availableSales;
      
      if (selectedSales.length > 0) {
        const assignedToSet = new Set(
          selectedSales.map(s => s.assigned_to).filter(Boolean) as string[]
        );
        
        // If all selected sales have the same assigned_to, auto-fill it
-       if (assignedToSet.size === 1) {
+       if (assignedToSet.size === 1 && !formData.assigned_to) {
          const suggestedSrId = Array.from(assignedToSet)[0];
          setFormData(prev => ({ ...prev, assigned_to: suggestedSrId }));
        }
+       
+       // Show warning if multiple assigned_to values exist (Route SR will override)
+       if (assignedToSet.size > 1) {
+         // Warning will be shown in UI below
+       }
      }
    }
  }, [formData.sale_ids, availableSales]);

+ // Check if selected sales have multiple assigned_to values
+ const selectedSales = formData.sale_ids
+   .map(saleId => availableSales.find(s => s.id === saleId))
+   .filter(Boolean) as typeof availableSales;
+ const assignedToSet = new Set(
+   selectedSales.map(s => s.assigned_to).filter(Boolean) as string[]
+ );
+ const hasMultipleAssignedTo = assignedToSet.size > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    ...
              <label className="block text-sm font-medium text-slate-700 mb-1">
                SR/Delivery Man <span className="text-red-500">*</span>
              </label>
+             {hasMultipleAssignedTo && (
+               <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
+                 ⚠️ <strong>Warning:</strong> Selected sales have different SR assignments. Route SR will override Sales SR for all included orders.
+               </div>
+             )}
              <select
```

**Lines Changed:** ~15 lines added/modified

---

## Total Changes Summary

| File | Functions/Components Changed | Lines Changed | Type |
|------|------------------------------|---------------|------|
| `supabase_db.py` | `create_route()` | 3 | Modified |
| `supabase_db.py` | `add_sales_to_route()` | 12 | Added/Modified |
| `supabase_db.py` | `remove_sale_from_route()` | 5 | Modified |
| `supabase_db.py` | `get_sales_report()` | 20 | Added |
| `supabase_db.py` | `get_collection_report()` | 25 | Added |
| `Sales.tsx` | `SalesOrder` interface | 1 | Added |
| `Sales.tsx` | `fetchSales()` mapping | 1 | Added |
| `Sales.tsx` | `ChallanPrintWrapper` | 25 | Modified |
| `Routes.tsx` | `CreateRouteModal` | 15 | Added/Modified |

**Total:** ~117 lines changed across 3 files

---

## Migrations Required

**None** - All changes use existing database schema:
- `sales.route_id` - Already exists
- `sales.assigned_to` - Already exists
- `sales.assigned_to_name` - Already exists
- `routes.assigned_to` - Already exists
- `routes.assigned_to_name` - Already exists

---

## Testing Checklist

### ✅ Automated Tests

**File:** `tests/test_route_sr_override.py`

1. ✅ `test_create_route_overrides_sales_assigned_to` - Verifies create_route() overrides sales.assigned_to
2. ✅ `test_add_sales_to_route_overrides_assigned_to` - Verifies add_sales_to_route() overrides sales.assigned_to
3. ✅ `test_add_sales_to_completed_route_fails` - Verifies guard blocks adding to completed route
4. ✅ `test_add_sales_to_reconciled_route_fails` - Verifies guard blocks adding to reconciled route
5. ✅ `test_remove_sale_from_completed_route_fails` - Verifies guard blocks removing from completed route
6. ✅ `test_remove_sale_from_reconciled_route_fails` - Verifies guard blocks removing from reconciled route

**Run tests:**
```bash
cd distrohub-backend
pytest tests/test_route_sr_override.py -v
```

---

### Manual Testing Steps

1. **Create Sale with SR-A:**
   - Create new sales order
   - Assign to SR-A
   - Verify `sales.assigned_to = SR-A` in database

2. **Create Route with SR-B, Add Sale:**
   - Create route with SR-B
   - Add sale (SR-A) to route
   - ✅ Verify `sales.assigned_to = SR-B` (overridden)
   - ✅ Verify challan shows SR-B name/phone
   - ✅ Verify sales report shows `effective_assigned_to = SR-B`

3. **Add Sales to Existing Route:**
   - Create route with SR-B
   - Add sale (SR-A) to existing route
   - ✅ Verify `sales.assigned_to = SR-B` (overridden)

4. **Multiple SRs Warning:**
   - Select sales with different SRs (SR-A, SR-B, SR-C)
   - ✅ Verify warning message appears: "Route SR will override Sales SR for all included orders"
   - Create route with SR-D
   - ✅ Verify all sales get `assigned_to = SR-D`

5. **Completed Route Guard:**
   - Create route, mark as completed
   - ✅ Attempt to add sales → Should fail with: "Cannot add sales to route with status 'completed'. Route is immutable."
   - ✅ Attempt to remove sales → Should fail with: "Cannot remove sales from route with status 'completed'. Route is immutable."

6. **Reconciled Route Guard:**
   - Reconcile a route
   - ✅ Attempt to add sales → Should fail with: "Cannot add sales to route with status 'reconciled'. Route is immutable."
   - ✅ Attempt to remove sales → Should fail with: "Cannot remove sales from route with status 'reconciled'. Route is immutable."
   - ✅ Attempt to update route → Should fail: "Cannot modify reconciled route" (already implemented)

7. **SR Accountability:**
   - Create route with SR-B, add sales
   - ✅ Verify SR accountability shows route under SR-B
   - ✅ Verify total expected cash includes these sales
   - ✅ Verify collection report includes these sales under SR-B

8. **Challan Print:**
   - Create sale with SR-A
   - Add to route with SR-B
   - Print challan
   - ✅ Verify challan shows SR-B name/phone (not SR-A)

9. **Sales Report:**
   - Create sale with SR-A
   - Add to route with SR-B
   - Run sales report
   - ✅ Verify sale has `effective_assigned_to = SR-B` (route's SR)
   - ✅ Verify sale has `effective_assigned_to_name = SR-B name`

---

## Behavior Verification

### Before Implementation:
- ❌ Sale with `assigned_to = SR-A` added to route with `assigned_to = SR-B` → Sale still shows SR-A
- ❌ Challan shows wrong SR (sale's SR, not route's SR)
- ❌ Sales report filters incorrectly
- ❌ Data inconsistency between sale and route
- ❌ No guard for completed/reconciled routes

### After Implementation:
- ✅ Sale with `assigned_to = SR-A` added to route with `assigned_to = SR-B` → Sale automatically updated to SR-B
- ✅ Challan shows correct SR (route's SR when in route, fallback to sale's SR)
- ✅ Sales report includes `effective_assigned_to` field (route SR when in route)
- ✅ Single source of truth: Route SR is authoritative
- ✅ Guards prevent modifying completed/reconciled routes
- ✅ Warning shown when multiple SRs selected

---

## Commit Details

**Commit 1:** `9383507` - "Implement Route SR override policy: Route SR overrides Sales SR when sales added to routes"
**Commit 2:** `0eb4e90` - "Add effective_assigned_to to sales report for route SR filtering"

**Files Changed:**
- `distrohub-backend/app/supabase_db.py` (~65 lines)
- `distrohub-frontend/src/pages/Sales.tsx` (~27 lines)
- `distrohub-frontend/src/pages/Routes.tsx` (~15 lines)
- `tests/test_route_sr_override.py` (new file, ~150 lines)

**Total:** ~257 lines (including tests)

---

## Summary

✅ **All requirements implemented:**
1. ✅ Backend: Route SR overrides Sales SR in `create_route()` and `add_sales_to_route()`
2. ✅ Backend: Guards prevent modifying completed/reconciled routes
3. ✅ Frontend: Challan print uses route SR when `route_id` exists
4. ✅ Frontend: Warning shown for multiple assigned_to values
5. ✅ Backend: Sales report includes `effective_assigned_to` field
6. ✅ Regression tests created

**No migrations required** - uses existing schema.

**Ready for testing and deployment!** 🚀
