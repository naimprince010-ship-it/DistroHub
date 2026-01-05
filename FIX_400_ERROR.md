# Fix 400 Bad Request Error

## 🔍 Problem:
- API call: `POST /api/auth/register` → `400 (Bad Request)`
- Alert shows success, but actual request failed
- Need to check error details

---

## 🎯 Debug Steps:

### Step 1: Check Error Details
**Console tab-এ**, failed request click করুন → **Response** tab → Error message দেখুন

**Or Console-এ type করুন:**
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
.then(response => {
  if (!response.ok) {
    return response.json().then(err => {
      console.error('Error:', err);
      throw new Error(err.detail || 'Registration failed');
    });
  }
  return response.json();
})
.then(data => {
  console.log('Success:', data);
  alert('Admin user created! You can now login.');
})
.catch(error => {
  console.error('Error:', error);
  alert('Error: ' + error.message);
});
```

---

## 🔧 Common 400 Errors:

### Error 1: Email Already Exists
**Message**: `"Email already registered"`
**Fix**: User already exists! Try login instead.

### Error 2: Invalid Role
**Message**: `"Invalid role"`
**Fix**: Role should be `"admin"` (not `"Admin"`)

### Error 3: Missing Fields
**Message**: `"Field required"`
**Fix**: Check all fields are present

---

## ✅ Quick Fix:

### Option 1: Check if User Already Exists
**Console-এ type করুন:**
```javascript
fetch('https://distrohub-backend.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@distrohub.com',
    password: 'admin123'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Login Success:', data);
  alert('User exists! Login successful.');
})
.catch(error => {
  console.error('Login Error:', error);
  alert('User does not exist. Need to create.');
});
```

### Option 2: Check Error Response
**Network tab-এ:**
1. `register` request click করুন
2. **Response** tab → Error message দেখুন
3. Share করুন: কি error message দেখাচ্ছে?

---

## 📋 Action Items:

1. **Network tab** → `register` request → **Response** tab → Error message check করুন
2. **Or** Console-এ updated code run করুন (error details দেখার জন্য)
3. **Share করুন**: কি error message দেখাচ্ছে?

---

**Next**: Network tab → Response tab → Error message check করুন → Share করুন!

