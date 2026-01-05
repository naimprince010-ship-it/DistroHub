# Supplier Persistence Debug Guide

## 🔍 Problem
Supplier add করার পর reload দিলে supplier থাকবে না।

## 🔎 Possible Causes

### 1. Backend Using InMemoryDatabase (Most Likely)
**Symptom:** Suppliers persist during session but disappear after server restart/reload

**Check:**
- Backend logs should show: `Failed to connect to Supabase: ... falling back to in-memory database`
- Or: No Supabase connection logs

**Solution:**
- Ensure `USE_SUPABASE=true` in Render environment variables
- Ensure `SUPABASE_URL` and `SUPABASE_KEY` are set correctly
- Restart backend service

### 2. Supabase RLS (Row Level Security) Policy Issue
**Symptom:** Suppliers created but not returned in GET request

**Check:**
- Supabase Dashboard → Authentication → Policies
- Check if `suppliers` table has RLS enabled
- Check if policies allow SELECT/INSERT

**Solution:**
- Disable RLS for `suppliers` table (for testing)
- Or create proper RLS policies

### 3. Frontend Not Refreshing After Create
**Symptom:** Supplier appears in UI but disappears after reload

**Check:**
- Browser console: Check if `fetchSuppliers()` is called after create
- Network tab: Check if GET `/api/suppliers` returns the new supplier

**Solution:**
- Already fixed with optimistic updates
- Check if background sync is working

## 🧪 Diagnostic Steps

### Step 1: Check Backend Database Type

**Render Dashboard:**
1. Go to your backend service
2. Check **Logs** tab
3. Look for:
   - `[Supabase] create_supplier: Inserting supplier data` → Using Supabase ✅
   - `Failed to connect to Supabase` → Using InMemory ❌

### Step 2: Check Environment Variables

**Render Dashboard → Environment:**
- `USE_SUPABASE` = `true` (not `True` or `TRUE`)
- `SUPABASE_URL` = `https://your-project.supabase.co`
- `SUPABASE_KEY` = `your-anon-key`

### Step 3: Test API Directly

**Browser Console (on Settings page):**
```javascript
// Test GET suppliers
fetch('https://distrohub-backend.onrender.com/api/suppliers', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Suppliers:', data);
  console.log('Count:', data.length);
});

// Test CREATE supplier
fetch('https://distrohub-backend.onrender.com/api/suppliers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    name: 'Test Supplier',
    phone: '01799999999',
    contact_person: 'Test Person',
    address: 'Test Address'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Created:', data);
  // Now test GET again
  return fetch('https://distrohub-backend.onrender.com/api/suppliers', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
})
.then(r => r.json())
.then(data => {
  console.log('After create - Suppliers:', data);
  console.log('Test supplier exists:', data.some(s => s.name === 'Test Supplier'));
});
```

### Step 4: Check Supabase Database Directly

**Supabase Dashboard:**
1. Go to **Table Editor**
2. Select `suppliers` table
3. Check if new suppliers are being saved
4. If not → Backend is using InMemoryDatabase

## 🔧 Solutions

### Solution 1: Fix Supabase Connection

**If backend is using InMemoryDatabase:**

1. **Render Dashboard:**
   - Go to your backend service
   - **Environment** tab
   - Add/Update:
     ```
     USE_SUPABASE = true
     SUPABASE_URL = https://your-project.supabase.co
     SUPABASE_KEY = your-anon-key
     ```
   - **Save** and **Redeploy**

2. **Verify:**
   - Check logs for Supabase connection
   - Should see: `[Supabase] create_supplier: Inserting supplier data`

### Solution 2: Fix RLS Policies

**If suppliers are created but not returned:**

1. **Supabase Dashboard:**
   - Go to **Authentication** → **Policies**
   - Find `suppliers` table
   - Check policies:
     - **SELECT**: Should allow authenticated users
     - **INSERT**: Should allow authenticated users
     - **UPDATE**: Should allow authenticated users
     - **DELETE**: Should allow authenticated users

2. **Or Disable RLS (for testing):**
   ```sql
   ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
   ```

### Solution 3: Verify Frontend Refresh

**Check browser console:**
- Should see: `[SupplierManagement] Refreshing suppliers list...`
- Should see: `[SupplierManagement] Suppliers fetched successfully`

**If not:**
- Check network tab for GET `/api/suppliers` request
- Check for timeout errors

## 📝 Quick Checklist

- [ ] Backend logs show Supabase connection
- [ ] Environment variables set correctly in Render
- [ ] Supabase database has suppliers table
- [ ] RLS policies allow SELECT/INSERT
- [ ] Frontend calls `fetchSuppliers()` after create
- [ ] GET `/api/suppliers` returns new supplier

---

**Most Common Issue:** Backend using InMemoryDatabase instead of Supabase
**Solution:** Set environment variables correctly in Render and redeploy

