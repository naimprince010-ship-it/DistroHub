# Production Verification Checklist - Supplier API

**Date**: _______________  
**Frontend URL**: _______________  
**Backend URL**: _______________

---

## Gate A: Console Log Marker

**Action**: Open Settings → Suppliers → DevTools Console

**PASS Criteria**:
```
[SupplierManagement] ============================================
[SupplierManagement] API MODE ACTIVE - Version: 2026-01-03
[SupplierManagement] ============================================
```

**Status**: [ ] PASS  [ ] FAIL

**If FAIL**:
1. Check Vercel deployment status → Must be "Ready" (green)
2. Hard refresh: `Ctrl + Shift + R`
3. Check browser cache → DevTools → Network → "Disable cache" → Reload
4. Verify latest commit deployed → Vercel Dashboard → Deployments → Check commit hash

---

## Gate B: GET Request on Load

**Action**: DevTools → Network → Clear log → Navigate to Settings → Suppliers

**PASS Criteria**:
```
GET /api/suppliers
Status: 200
Request Headers:
  Authorization: Bearer <token>
Response: [array of suppliers]
```

**Status**: [ ] PASS  [ ] FAIL

**If FAIL**:
1. **No request at all**:
   - Check console for errors
   - Verify `fetchSuppliers()` is called (check console logs)
   - Check if token exists: `localStorage.getItem('token')` in console

2. **Request returns 401**:
   - Token expired → Re-login
   - Check token format: Should start with `eyJ...`
   - Verify `api.ts` adds Authorization header

3. **Request returns 404/500**:
   - Check backend URL: `VITE_API_URL` in Vercel env vars
   - Verify backend is running: Check Render service status
   - Check CORS: Backend must allow frontend origin

4. **Request blocked (CORS)**:
   - Check Render backend CORS settings
   - Verify frontend origin in `allowed_origins`
   - Check browser console for CORS error message

---

## Gate C: Create Supplier (POST)

**Action**: Click "Add Supplier" → Fill form → Submit

**PASS Criteria**:
```
POST /api/suppliers
Status: 201 (or 200)
Request Headers:
  Authorization: Bearer <token>
Request Body: {name, phone, contact_person, address, email}
Response Body: {id: "...", name: "...", created_at: "..."}
```

**Status**: [ ] PASS  [ ] FAIL

**If FAIL**:
1. **Status 401**:
   - Token expired → Re-login
   - Check token in localStorage

2. **Status 403**:
   - Check Supabase RLS policies → Must allow insert
   - Check Render logs for permission error

3. **Status 422**:
   - Check request payload structure
   - Verify required fields: `name`, `phone`
   - Check Render logs for validation error

4. **Status 500**:
   - Check Render logs: `[API] create_supplier` error
   - Check Supabase connection: `[Supabase] create_supplier` error
   - Verify Supabase env vars in Render

5. **Status 200/201 but no `id` in response**:
   - Check Render logs: `[Supabase] create_supplier: Insert failed`
   - Verify Supabase table exists
   - Check Supabase insert response in logs

---

## Gate D: Persistence (Reload)

**Action**: Reload page → Check Network tab for GET request

**PASS Criteria**:
```
GET /api/suppliers
Status: 200
Response: [array including the created supplier]
  - Supplier `id` matches POST response `id`
  - Supplier `name` matches created name
```

**Status**: [ ] PASS  [ ] FAIL

**If FAIL**:
1. **Supplier missing from GET response**:
   - Check Render logs: `[Supabase] get_suppliers: Retrieved X suppliers`
   - Verify count increased (was X, now X+1)
   - Check if query has filtering: `get_suppliers()` should not filter by user/tenant
   - Verify Supabase directly: Run SQL `SELECT * FROM suppliers ORDER BY created_at DESC LIMIT 5;`

2. **GET returns different count**:
   - Check if supplier was actually inserted (Gate C response had `id`)
   - Check Render logs for insert success: `[Supabase] create_supplier: Supplier created successfully`
   - Verify Supabase table: Supplier should exist in database

3. **GET returns 401/403**:
   - Token expired → Re-login
   - Check RLS policies for SELECT

---

## Final Status

- [ ] Gate A: PASS
- [ ] Gate B: PASS
- [ ] Gate C: PASS
- [ ] Gate D: PASS

**Overall**: [ ] PASS  [ ] FAIL

**If ALL PASS**: ✅ Supplier persistence fix confirmed in production

**If ANY FAIL**: See specific inspection steps above

---

## Quick Inspection Commands

### Check Vercel Env Vars
```powershell
# Vercel Dashboard → Settings → Environment Variables
# Verify: VITE_API_URL = https://your-backend.onrender.com
```

### Check Token
```javascript
// Browser Console:
localStorage.getItem('token')
// Should return: eyJhbGciOiJIUzI1NiIs...
```

### Check Backend Status
```powershell
# Render Dashboard → Service Status
# Should be: Running (green)
```

### Check CORS
```powershell
# Render Dashboard → Environment → Check CORS_ALLOWED_ORIGINS
# Should include: https://your-frontend.vercel.app
```

---

## Evidence Required

- [ ] Console log screenshot (Gate A)
- [ ] Network tab screenshot: GET request (Gate B)
- [ ] Network tab screenshot: POST request (Gate C)
- [ ] Network tab screenshot: GET after reload (Gate D)
- [ ] Render log excerpts (if any failures)

