# Quick Verification - PowerShell Commands

## Step 1: Get Auth Token from Frontend

1. Open production frontend in browser
2. Login
3. Open DevTools (F12) → Console tab
4. Run:
```javascript
localStorage.getItem('token')
```
5. Copy the token (full string)

## Step 2: Run Verification Script

### Option A: Using Token from Frontend (Recommended)

```powershell
# Set your production backend URL
$API_URL = "https://your-backend.onrender.com"

# Set token from localStorage (paste the full token string)
$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Run verification
python verify_supplier_production.py --api-url $API_URL --token $TOKEN
```

### Option B: Using Email/Password

```powershell
$API_URL = "https://your-backend.onrender.com"
python verify_supplier_production.py --api-url $API_URL --email admin@distrohub.com --password admin123
```

## Expected PASS Output

```
================================================================================
SUPPLIER PERSISTENCE - PRODUCTION VERIFICATION
================================================================================
API URL: https://your-backend.onrender.com
Timestamp: 2026-01-03T14:30:22.123456

[1] Checking if backend server is running...
✓ Backend server is running

[2] Authenticating...
✓ Authentication successful
  Token: eyJhbGciOiJIUzI1NiIs...

[3] Fetching existing suppliers (baseline)...
✓ Found 5 existing suppliers

[4] Creating a test supplier...
  Request URL: https://your-backend.onrender.com/api/suppliers
  Status Code: 201
  Request Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
✓ Supplier created successfully!
  ID: 550e8400-e29b-41d4-a716-446655440000
  Name: QA Supplier 2026-01-03-143022
  Created At: 2026-01-03T14:30:22.789Z
  Full Response: {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "QA Supplier 2026-01-03-143022",
    "phone": "01712345678",
    "contact_person": "Test Contact 2026-01-03-143022",
    "address": "Test Address 2026-01-03-143022",
    "email": null,
    "created_at": "2026-01-03T14:30:22.789Z"
  }

[5] Waiting 2 seconds for database propagation...

[6] Verifying persistence (fetching all suppliers again)...
✓ Retrieved 6 suppliers
✓ Supplier persists in database!
  Found: QA Supplier 2026-01-03-143022
  ID matches: True
  Total suppliers: 6 (was 5)

[7] Cleaning up test supplier...
✓ Test supplier deleted

================================================================================
✓ ALL TESTS PASSED - Supplier persistence is working!
================================================================================
```

## Common FAIL Outputs

### FAIL 1: Authentication Failed (401)

```
[2] Authenticating...
✗ Login failed: 401
  Response: {"detail":"Invalid credentials"}
```

**Meaning**: Token expired or invalid

**Fix**: Get fresh token from frontend localStorage, or check email/password

---

### FAIL 2: POST Failed (4xx/5xx)

```
[4] Creating a test supplier...
  Status Code: 422
✗ Failed to create supplier: 422
  Response: {"detail":"Validation error: phone is required"}
```

**Meanings**:
- **401**: Token invalid/expired → Get new token
- **403**: Permission denied (RLS policy) → Check Supabase RLS
- **409**: Duplicate name → Use unique name
- **422**: Validation error → Check request payload
- **500**: Server error → Check Render logs

**Next Fix**: Check Render logs for `[API] create_supplier` error details

---

### FAIL 3: POST Success but No ID

```
[4] Creating a test supplier...
  Status Code: 200
✗ No ID in response!
  Response: {"name": "QA Supplier...", "phone": "..."}
```

**Meaning**: Supabase insert failed silently, returned input data without `id`

**Next Fix**: Check Render logs for `[Supabase] create_supplier: Insert failed`

**Code Change** (if insert failing):
```python
# In supabase_db.py, create_supplier()
# Add explicit error check:
if not result.data or not result.data[0].get('id'):
    raise ValueError("Supabase insert returned no data or missing id")
```

---

### FAIL 4: POST Success but GET Missing Supplier

```
[4] Creating a test supplier...
✓ Supplier created successfully!
  ID: 550e8400-e29b-41d4-a716-446655440000

[6] Verifying persistence...
✓ Retrieved 5 suppliers
✗ Supplier NOT found in database!
  Looking for ID: 550e8400-e29b-41d4-a716-446655440000
  Total suppliers: 5 (was 5)
```

**Meaning**: Supplier created but not returned by GET query

**Possible Causes**:
1. Tenant/user filtering in GET query
2. Different table being read
3. Caching issue

**Next Fix**: Check `get_suppliers()` query in `supabase_db.py`:

```python
# Current (should be):
result = self.client.table("suppliers").select("*").execute()

# If tenant filtering exists, remove it:
# WRONG: .eq("user_id", user_id)
# CORRECT: .select("*").execute()
```

**Also check**: Render logs for `[Supabase] get_suppliers: Retrieved X suppliers` - does count match?

---

### FAIL 5: Connection Error

```
[1] Checking if backend server is running...
✗ Backend server is NOT reachable!
```

**Meaning**: Backend URL wrong or server down

**Fix**: Verify Render backend URL is correct and service is running

---

## Minimal Code Fixes by Failure Type

### If POST Returns 422 (Validation Error)

**Check**: Request payload structure
**Fix**: Ensure frontend sends:
```json
{
  "name": "string",
  "phone": "string",
  "contact_person": "string | null",
  "address": "string | null",
  "email": "string | null"
}
```

### If POST Returns 500 (Server Error)

**Check**: Render logs for `[Supabase] create_supplier: Insert failed`
**Fix**: 
1. Verify Supabase connection (env vars)
2. Check Supabase table exists
3. Check RLS policies allow insert

### If POST Returns 200 but Response Missing `id`

**Fix in `supabase_db.py`**:
```python
def create_supplier(self, data: dict) -> dict:
    # ... existing code ...
    if not result.data or len(result.data) == 0:
        raise ValueError("Supabase insert returned no data")
    supplier = result.data[0]
    if not supplier.get('id'):
        raise ValueError("Supabase insert returned data without id")
    return supplier
```

### If GET Missing Supplier After Successful POST

**Fix in `supabase_db.py`**:
```python
def get_suppliers(self) -> List[dict]:
    # Ensure no filtering:
    result = self.client.table("suppliers").select("*").execute()
    # NOT: .eq("user_id", ...) or .eq("tenant_id", ...)
    return result.data or []
```

### If 401 Token Error

**Fix**: Script needs to handle token refresh or use email/password login

**Update script** to add `--token` option:
```python
parser.add_argument("--token", help="Auth token (from localStorage)")
# Then use token directly in headers instead of login
```

---

## Quick PowerShell One-Liner

```powershell
# Method 1: Using token (get from browser console: localStorage.getItem('token'))
python verify_supplier_production.py --api-url "https://your-backend.onrender.com" --token "paste-token-here"

# Method 2: Using email/password
python verify_supplier_production.py --api-url "https://your-backend.onrender.com" --email admin@distrohub.com --password admin123
```

**Recommended**: Get token from browser console (faster, no login needed):
1. Open frontend → Login → F12 → Console
2. Run: `localStorage.getItem('token')`
3. Copy token
4. Use `--token` option

