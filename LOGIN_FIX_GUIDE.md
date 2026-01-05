# Login সমস্যা সমাধান গাইড

## সমস্যা
User login করতে পারছে না।

## সমাধান করা হয়েছে

### 1. Login Endpoint-এ Better Error Logging যোগ করা হয়েছে
- এখন login fail হলে console-এ detailed error message দেখাবে
- User না থাকলে বা password wrong হলে specific message দেখাবে

### 2. SupabaseDatabase-এ Missing Methods যোগ করা হয়েছে
- `create_purchase()` method যোগ করা হয়েছে
- `create_sale()` method যোগ করা হয়েছে

## Login সমস্যা Diagnose করার উপায়

### Option 1: Diagnostic Script ব্যবহার করুন
```bash
cd distrohub-backend
python test_login.py
```

এই script check করবে:
- Database connection
- User exists কিনা
- Password hash correct কিনা

### Option 2: Manual Check

#### Step 1: কোন Database ব্যবহার হচ্ছে?
Backend environment variables check করুন:
- `USE_SUPABASE=true` → Supabase ব্যবহার করছে
- `USE_SUPABASE=false` বা not set → In-Memory Database ব্যবহার করছে

#### Step 2: User আছে কিনা Check করুন

**In-Memory Database হলে:**
- Default user automatically create হয়:
  - Email: `admin@distrohub.com`
  - Password: `admin123`

**Supabase Database হলে:**
1. Supabase Dashboard → Table Editor → `users` table
2. Check করুন user আছে কিনা
3. যদি না থাকে, register endpoint ব্যবহার করুন:
   ```bash
   POST /api/auth/register
   {
     "email": "admin@distrohub.com",
     "password": "admin123",
     "name": "Admin User",
     "role": "admin"
   }
   ```

#### Step 3: Password Hash Check করুন

Password hash correct হতে হবে:
- Password: `admin123`
- Hash (SHA256): `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`

Supabase-এ manually update করতে হলে:
1. Supabase Dashboard → Table Editor → `users` table
2. `admin@distrohub.com` user-এর `password_hash` field update করুন
3. উপরের hash value set করুন

## Common Issues এবং Solutions

### Issue 1: "Invalid email or password"
**সমাধান:**
- User database-এ আছে কিনা check করুন
- Password hash correct কিনা verify করুন
- Diagnostic script run করুন

### Issue 2: User নেই Database-এ
**সমাধান:**
- Register endpoint ব্যবহার করুন user create করতে
- অথবা manually Supabase-এ insert করুন

### Issue 3: Password Hash Mismatch
**সমাধান:**
- Correct hash: `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`
- Supabase-এ manually update করুন

## Testing Login

### Browser Console-এ Test করুন:
```javascript
fetch('YOUR_API_URL/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@distrohub.com',
    password: 'admin123'
  })
})
.then(r => r.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

### cURL ব্যবহার করে:
```bash
curl -X POST YOUR_API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@distrohub.com","password":"admin123"}'
```

## Next Steps

1. **Diagnostic script run করুন** - `python test_login.py`
2. **Backend logs check করুন** - login attempt-এর detailed logs দেখবেন
3. **Database check করুন** - user exists এবং password hash correct কিনা verify করুন
4. **Environment variables check করুন** - correct database ব্যবহার হচ্ছে কিনা

## Additional Notes

- In-Memory Database: Server restart হলে data reset হয়
- Supabase Database: Data persist হয়, কিন্তু user manually create করতে হবে
- Password hashing: SHA256 ব্যবহার করা হয়

