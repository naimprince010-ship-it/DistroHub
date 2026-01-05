# Production Verification - 4 Gates

## Gate A: Console Marker
**Check**: Settings → Suppliers → Console tab

**PASS**: Shows `[SupplierManagement] API MODE ACTIVE - Version: 2026-01-03`  
**FAIL**: Not visible

**If FAIL**: Hard refresh (`Ctrl+Shift+R`), check Vercel deployment status, verify latest commit deployed

---

## Gate B: GET on Load
**Check**: Network tab → Navigate to Settings → Suppliers

**PASS**: `GET /api/suppliers` → `200` with `Authorization: Bearer <token>`  
**FAIL**: Request missing or error status

**If FAIL**:
- **No request**: Check console errors, verify token exists (`localStorage.getItem('token')`)
- **401**: Token expired → Re-login
- **404/500**: Check `VITE_API_URL` in Vercel env, verify backend running
- **CORS**: Check Render CORS settings, verify frontend origin allowed

---

## Gate C: Create Supplier
**Check**: Add Supplier → Submit → Network tab

**PASS**: `POST /api/suppliers` → `201/200` with `id` and `created_at` in response  
**FAIL**: Error status or missing `id`

**If FAIL**:
- **401**: Token expired → Re-login
- **403**: Check Supabase RLS policies (must allow insert)
- **422**: Check request payload (required: `name`, `phone`)
- **500**: Check Render logs for `[API] create_supplier` or `[Supabase] create_supplier` error
- **200 but no `id`**: Check Render logs for insert failure

---

## Gate D: Persistence
**Check**: Reload page → Network tab → GET request

**PASS**: `GET /api/suppliers` includes created supplier (matching `id` and `name`)  
**FAIL**: Supplier missing from response

**If FAIL**:
- Check Render logs: `[Supabase] get_suppliers: Retrieved X suppliers` (count should increase)
- Verify `get_suppliers()` has no user/tenant filtering
- Check Supabase directly: `SELECT * FROM suppliers ORDER BY created_at DESC LIMIT 5;`
- Verify POST actually succeeded (Gate C response had `id`)

---

## Status
- [ ] Gate A: PASS / FAIL
- [ ] Gate B: PASS / FAIL
- [ ] Gate C: PASS / FAIL
- [ ] Gate D: PASS / FAIL

**All PASS?** → ✅ Fix confirmed  
**Any FAIL?** → Follow inspection steps above

