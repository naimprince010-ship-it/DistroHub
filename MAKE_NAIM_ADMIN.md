# Make Naim Rahaman Admin - Step by Step Guide

## Method 1: Using Supabase Table Editor (Easiest)

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **"Table Editor"** (left sidebar)

### Step 2: Find Users Table
1. Click on **`public.users`** table
2. Find the row with email: **`naimprince236@gmail.com`**
3. Find the **`role`** column

### Step 3: Edit Role
1. Click on the **`role`** cell for Naim Rahaman
2. Change value from: **`sales_rep`**
3. Change value to: **`admin`**
4. Press **Enter** or click outside to save

### Step 4: Verify
- The role should now show **`admin`**
- Refresh the page to confirm

---

## Method 2: Using SQL Editor (Alternative)

### Step 1: Open SQL Editor
1. Go to Supabase Dashboard
2. Click **"SQL Editor"** (left sidebar)
3. Click **"New query"**

### Step 2: Run SQL Query
Copy and paste this SQL:

```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'naimprince236@gmail.com';
```

### Step 3: Execute
1. Click **"Run"** button (or press `Ctrl + Enter`)
2. You should see: "Success. No rows returned"

### Step 4: Verify
Run this query to check:

```sql
SELECT id, email, name, role
FROM public.users
WHERE email = 'naimprince236@gmail.com';
```

Expected result:
```
email: naimprince236@gmail.com
name: Naim Rahaman
role: admin  ✅
```

---

## Method 3: Using Backend API (If you have admin access)

If you're already logged in as admin, you can use the API:

### Step 1: Get User ID
First, find Naim's user ID:

```javascript
// In browser console on your app
const users = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
}).then(r => r.json());

const naim = users.find(u => u.email === 'naimprince236@gmail.com');
console.log('Naim User ID:', naim.id);
```

### Step 2: Update Role via API
```javascript
const userId = 'naim-user-id'; // From step 1
const token = localStorage.getItem('token');

fetch(`/api/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'admin'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Updated:', data);
});
```

---

## Quick SQL Script (Copy-Paste Ready)

If you prefer SQL, here's the complete script:

```sql
-- Make Naim Rahaman Admin
UPDATE public.users
SET role = 'admin'
WHERE email = 'naimprince236@gmail.com';

-- Verify the change
SELECT 
    id,
    email,
    name,
    role,
    created_at
FROM public.users
WHERE email = 'naimprince236@gmail.com';
```

---

## After Making Admin

### Test Admin Access:
1. **Logout** from current session (if logged in as Naim)
2. **Login again** with: `naimprince236@gmail.com`
3. **Check permissions:**
   - Should see all admin features
   - Should access admin-only pages
   - Should see "Admin" role in profile

---

## Important Notes

- ✅ Role change takes effect immediately
- ✅ User needs to logout and login again to see changes
- ✅ Admin role gives full access to all features
- ⚠️ Make sure you have permission to change roles

---

## Troubleshooting

### Issue: Can't edit in Table Editor
**Solution:** Check if RLS (Row Level Security) is enabled. You may need to disable it temporarily or use SQL Editor.

### Issue: SQL query doesn't work
**Solution:** 
1. Check you're in the correct database
2. Verify email is exactly: `naimprince236@gmail.com`
3. Check for typos in role value (should be `admin`, not `Admin` or `ADMIN`)

### Issue: Role changed but user still sees old permissions
**Solution:** User needs to logout and login again to refresh their session.

---

**Status**: Follow Method 1 (Table Editor) for the easiest way!
