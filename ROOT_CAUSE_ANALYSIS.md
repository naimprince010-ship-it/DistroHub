# Root Cause Analysis: SMS Settings Toggle Failure

## Problem
- Toggle shows "Saving..." but then displays error: "Failed to update [event name]. Please try again."
- All 4 toggles (Low Stock, Expiry, Payment Due, New Order) fail with the same error
- Status code: **500 Internal Server Error**

## Root Cause (CONFIRMED)
**Row-Level Security (RLS) Policy Violation**

Error from logs:
```json
{
  "detail": "Failed to update SMS settings: {
    'message': 'new row violates row-level security policy for table \"sms_settings\"',
    'code': '42501',
    'hint': None,
    'details': None
  }"
}
```

### Why This Happens
1. **RLS Policies Check `auth.uid()`**: The current RLS policies require `auth.uid() = user_id`
2. **Backend Uses Service Role Key**: The backend uses `SUPABASE_KEY` (service_role or anon key) which doesn't have user context
3. **`auth.uid()` Returns NULL**: When using service role key, `auth.uid()` is NULL, so the policy check fails

### Current RLS Policies (Problematic)
```sql
-- These policies check auth.uid() which is NULL for service role
CREATE POLICY "Users can insert their own SMS settings" ON sms_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Solution

### Option 1: Use Service Role Key (Recommended)
- Service role key **automatically bypasses RLS**
- Ensure `SUPABASE_KEY` environment variable contains the **service_role** key (not anon key)
- Location: Supabase Dashboard → Settings → API → service_role key

### Option 2: Fix RLS Policies (If using anon key)
Run this migration in Supabase SQL Editor:

```sql
-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can view their own SMS settings" ON sms_settings;
DROP POLICY IF EXISTS "Users can update their own SMS settings" ON sms_settings;
DROP POLICY IF EXISTS "Users can insert their own SMS settings" ON sms_settings;

-- Create permissive policies
CREATE POLICY "Allow all to view SMS settings" ON sms_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow all to update SMS settings" ON sms_settings
    FOR UPDATE USING (true);

CREATE POLICY "Allow all to insert SMS settings" ON sms_settings
    FOR INSERT WITH CHECK (true);
```

## Verification Steps

1. **Check Backend Key Type**:
   - Railway/Render → Environment Variables → `SUPABASE_KEY`
   - Should be **service_role** key (longer, starts with `eyJ...`)

2. **Apply RLS Fix** (if needed):
   - Supabase Dashboard → SQL Editor
   - Run migration: `20260106000000_fix_sms_settings_rls_urgent.sql`

3. **Test Toggle**:
   - Toggle any notification setting
   - Should return 200 OK (not 500)
   - No error alert should appear

4. **Verify Persistence**:
   - Toggle ON → Reload page → Should still be ON
   - Check Supabase: `SELECT * FROM sms_settings ORDER BY updated_at DESC;`

## Files Changed
- `distrohub-backend/supabase/migrations/20260106000000_fix_sms_settings_rls_urgent.sql` (NEW)
- No code changes needed (backend logic is correct)




