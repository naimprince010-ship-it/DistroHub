# Create Admin User in Supabase

## 🔍 Problem:
- Backend is using Supabase (`USE_SUPABASE` = `true`)
- Admin user doesn't exist in Supabase database
- 401 error because user not found

---

## ✅ Solution: Create Admin User

### Method 1: Use Register API (Easiest) ⭐

**Browser Console-এ (Login page-এ):**

1. **F12** press করুন → **Console** tab
2. এই code paste করুন:

```javascript
fetch('https://distrohub-backend.onrender.com/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@distrohub.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
  alert('Admin user created! You can now login.');
})
.catch(error => {
  console.error('Error:', error);
  alert('Error creating user. Check console for details.');
});
```

3. **Enter** press করুন
4. Success হলে → **Login try করুন**

---

### Method 2: Supabase Dashboard (Manual)

1. **Supabase Dashboard** → https://supabase.com/dashboard
2. Your project → **Table Editor**
3. `users` table select করুন
4. **Insert row** → Add:
   - `email`: `admin@distrohub.com`
   - `name`: `Admin User`
   - `role`: `admin`
   - `password_hash`: `240be518fabd2724ddb6f04eeb9d5b0a8e0b5e2b4c3d5e6f7a8b9c0d1e2f3a4b` (SHA256 of "admin123")
   - `phone`: `01700000000` (optional)
   - `created_at`: Current timestamp

---

### Method 3: Test with curl/Postman

```bash
curl -X POST https://distrohub-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@distrohub.com",
    "password": "admin123",
    "name": "Admin User",
    "role": "admin"
  }'
```

---

## 🧪 After Creating User:

1. **Go back to login page**
2. **Sign In** with:
   - Email: `admin@distrohub.com`
   - Password: `admin123`
3. Should work now! ✅

---

## 📋 Quick Steps:

1. **Browser Console** → Method 1 code paste করুন
2. **Enter** press করুন
3. **Success message** দেখুন
4. **Login try করুন**

---

**Next**: Browser Console-এ Method 1 code run করুন → Admin user create হবে → Login try করুন!

