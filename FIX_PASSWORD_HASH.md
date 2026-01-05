# Fix Password Hash in Supabase

## 🔍 Problem:
Login still failing - likely password hash mismatch.

---

## ✅ Correct Password Hash:
Password: `admin123`
Hash: `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`

---

## 🔧 Fix Steps:

### Option 1: Update Password Hash in Supabase (Recommended)

1. **Supabase Dashboard** → https://supabase.com/dashboard
2. Your project → **Table Editor**
3. `users` table select করুন
4. Find `admin@distrohub.com` row
5. Click **Edit** (pencil icon)
6. `password_hash` field-এ এই value set করুন:
   ```
   240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
   ```
7. **Save** করুন
8. **Login try করুন**

---

### Option 2: Delete and Recreate User

1. **Supabase Dashboard** → Table Editor → `users` table
2. Find `admin@distrohub.com` row
3. **Delete** করুন
4. **Console-এ** register code run করুন (user create হবে)
5. **Login try করুন**

---

### Option 3: Check Network Response

**Network tab-এ:**
1. `login` request click করুন
2. **Response** tab → Error message দেখুন
3. **Share করুন**: কি error দেখাচ্ছে?

---

## 🧪 Test Login:

**Console-এ type করুন:**
```javascript
fetch('https://distrohub-backend.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@distrohub.com',
    password: 'admin123'
  })
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response:', data);
  if (data.access_token) {
    alert('Login successful!');
  } else {
    alert('Login failed: ' + (data.detail || 'Unknown error'));
  }
})
.catch(error => {
  console.error('Error:', error);
  alert('Network error');
});
```

---

## 📋 Action Items:

1. **Supabase Dashboard** → `users` table → `password_hash` update করুন
2. **Or** Network tab → Response → Error message check করুন
3. **Share করুন**: কি দেখাচ্ছে?

---

**Next**: Supabase-এ password_hash update করুন → Login try করুন!

