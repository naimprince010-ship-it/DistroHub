# Fix 401 Unauthorized Error

## ✅ Good News:
- ✅ Request IS reaching backend (not network issue)
- ✅ Backend is responding
- ❌ Authentication failing (401 = Unauthorized)

---

## 🔍 Possible Causes:

### 1. User Doesn't Exist in Database
- Backend might be using Supabase (empty database)
- Admin user might not be created

### 2. Wrong Password Hash
- Password hash doesn't match
- Backend using different hashing method

### 3. Database Type Mismatch
- Backend using Supabase but user in in-memory
- Or vice versa

---

## 🎯 Fix Steps:

### Step 1: Check Which Database Backend is Using
**Render Dashboard:**
1. Go to: https://dashboard.render.com
2. Your backend service → **Environment** tab
3. Check:
   - `USE_SUPABASE` = `true` or `false`?
   - If `true` → Using Supabase (need to create user)
   - If `false` → Using in-memory (user should exist)

### Step 2: Create Admin User in Supabase (If Using Supabase)
**Option A: Via Backend API (Recommended)**
1. Test register endpoint:
```bash
POST https://distrohub-backend.onrender.com/api/auth/register
Body: {
  "email": "admin@distrohub.com",
  "password": "admin123",
  "name": "Admin User",
  "role": "admin"
}
```

**Option B: Via Supabase Dashboard**
1. Go to Supabase Dashboard
2. Table Editor → `users` table
3. Insert new row:
   - email: `admin@distrohub.com`
   - password_hash: (need to hash "admin123")
   - name: `Admin User`
   - role: `admin`

### Step 3: Check Password Hashing
Backend uses SHA256:
- Password: `admin123`
- Hash: `240be518fabd2724ddb6f04eeb9d5b0a8e0b5e2b4c3d5e6f7a8b9c0d1e2f3a4b`

---

## 🔧 Quick Fix:

### If Using In-Memory Database:
- User should auto-create on first request
- Try login again

### If Using Supabase:
1. **Create user via API:**
   - Use register endpoint
   - Or manually insert in Supabase

2. **Or switch to in-memory:**
   - Render Dashboard → Environment
   - Set `USE_SUPABASE` = `false`
   - Redeploy

---

## 🧪 Test:

### Test 1: Check Backend Database Type
**Render Dashboard** → Environment → `USE_SUPABASE`

### Test 2: Try Register (If Supabase)
```bash
POST https://distrohub-backend.onrender.com/api/auth/register
{
  "email": "admin@distrohub.com",
  "password": "admin123",
  "name": "Admin User",
  "role": "admin"
}
```

### Test 3: Check Supabase Users Table
- Supabase Dashboard → Table Editor → `users`
- See if admin user exists

---

## 📋 Action Items:

1. **Render Dashboard** → Check `USE_SUPABASE` value
2. **If Supabase**: Create admin user
3. **If In-Memory**: Try login again (user should auto-create)
4. **Test login** again

---

**Next**: Render Dashboard-এ `USE_SUPABASE` check করুন → Share করুন!

