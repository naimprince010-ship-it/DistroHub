# Allow Pasting in Console - Quick Steps

## 🔍 Security Warning:
Console-এ code paste করার আগে security check করতে হবে।

---

## ✅ Steps:

### Step 1: Allow Pasting
1. **Console tab-এ** (যেখানে `>` prompt আছে)
2. Type করুন: `allow pasting`
3. **Enter** press করুন
4. এখন code paste করতে পারবেন

### Step 2: Paste Register Code
Console-এ এই code paste করুন:

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

### Step 3: Press Enter
- **Enter** press করুন
- Success হলে → Alert দেখবেন
- Error হলে → Console-এ error দেখবেন

---

## 🧪 After Success:

1. **Login page-এ যান**
2. **Sign In** করুন:
   - Email: `admin@distrohub.com`
   - Password: `admin123`
3. **Login successful হবে!** ✅

---

## 📋 Quick Checklist:

- [ ] Console-এ `allow pasting` type করুন
- [ ] Enter press করুন
- [ ] Register code paste করুন
- [ ] Enter press করুন
- [ ] Success message দেখুন
- [ ] Login try করুন

---

**Next**: Console-এ `allow pasting` type করুন → Enter → Code paste করুন!

