# Browser Verification Steps - SR Accountability

## 🔍 Current Status
- ✅ Page loaded: `/accountability`
- ✅ Network tab open
- ⏳ No SR selected yet

---

## 📋 Step-by-Step Verification

### Step 1: Select SR "Jahid Islam"

1. **Click** on "Select SR" dropdown
2. **Select** "Jahid Islam" (or any SR that has routes/payments)
3. **Wait** for data to load

---

### Step 2: Check Network Tab for API Call

After selecting SR, you should see:

1. **Look for** a request named: `/api/users/{sr_id}/accountability`
   - Type: `Fetch/XHR` or `xhr`
   - Status: Should be `200` (OK)

2. **Click** on that request

3. **Go to** "Response" tab (or "Preview" tab)

4. **Check** the JSON response structure:
   ```json
   {
     "user_id": "...",
     "user_name": "Jahid Islam",
     "total_expected_cash": 20400.0,
     "total_collected": 20400.0,  // ✅ MUST BE PRESENT
     "total_returns": 0.0,        // ✅ MUST BE PRESENT
     "current_outstanding": 0.0,
     ...
   }
   ```

**What to Look For:**
- ✅ `total_collected` field exists → Backend deployed correctly
- ✅ `total_returns` field exists → Backend deployed correctly
- ❌ Fields missing → Backend not deployed

---

### Step 3: Check Frontend Code (Sources Tab)

1. **Open** "Sources" tab in DevTools
2. **Navigate** to: `webpack://` → `./src/pages/Accountability.tsx`
3. **Find** line ~161 (around Total Collected display)
4. **Check** the code:
   - ✅ **Correct:** `accountability.total_collected.toLocaleString()`
   - ❌ **Wrong:** `accountability.reconciliations.reduce(...)`

**What to Look For:**
- ✅ Uses `accountability.total_collected` → Frontend deployed correctly
- ❌ Uses `reconciliations.reduce` → Frontend not deployed (old code)

---

### Step 4: Check UI Display

After selecting SR, check the cards:

1. **Total Collected** card:
   - Should show: ৳20,400 (not 0)
   - If shows 0 → Check API response

2. **Current Outstanding** card:
   - Should show: ৳0 (not 20,400)
   - Formula: Total Expected - Total Collected - Total Returns

---

## 🐛 Troubleshooting

### Issue 1: API Response Missing Fields

**Symptoms:**
- API response doesn't have `total_collected` or `total_returns`
- Response structure is old

**Solution:**
- Backend not deployed → Redeploy backend (Render/Railway)

---

### Issue 2: API Has Fields But Values Are 0

**Symptoms:**
- `total_collected: 0` but payments exist
- `total_returns: 0`

**Possible Causes:**
- Payment `route_id` is NULL
- Payments not linked to routes
- Route status issue

**Check:**
- Look at the API response `routes` array
- Check if routes have payments
- Verify route status

---

### Issue 3: Frontend Shows Old Code

**Symptoms:**
- Sources tab shows `reconciliations.reduce(...)`
- UI calculates manually

**Solution:**
- Frontend not deployed → Redeploy frontend (Vercel)
- Clear browser cache

---

### Issue 4: UI Shows 0 But API Has Values

**Symptoms:**
- API response has correct values
- UI still shows 0

**Solution:**
- Clear browser cache
- Hard refresh: `Ctrl+Shift+R`
- Check console for errors

---

## ✅ Expected Results

After following all steps:

1. **API Response:**
   ```json
   {
     "total_collected": 20400.0,  // ✅ Present
     "total_returns": 0.0,        // ✅ Present
     "current_outstanding": 0.0   // ✅ Correct
   }
   ```

2. **Frontend Code:**
   ```typescript
   ৳ {accountability.total_collected.toLocaleString()}  // ✅ Correct
   ```

3. **UI Display:**
   - Total Collected: ৳20,400 ✅
   - Current Outstanding: ৳0 ✅

---

## 📝 Quick Checklist

- [ ] SR selected (Jahid Islam)
- [ ] Network tab shows `/api/users/{sr_id}/accountability` request
- [ ] API response includes `total_collected` field
- [ ] API response includes `total_returns` field
- [ ] API `total_collected` value = 20,400 (not 0)
- [ ] Sources tab shows `accountability.total_collected` (not `reconciliations.reduce`)
- [ ] UI displays Total Collected = 20,400
- [ ] UI displays Current Outstanding = 0

---

## 🚀 Next Steps Based on Results

### If All Checks Pass:
✅ Fix is working! Issue resolved.

### If API Missing Fields:
→ Redeploy backend (Render/Railway)

### If Frontend Shows Old Code:
→ Redeploy frontend (Vercel) + Clear cache

### If API Has Fields But Values 0:
→ Check payment `route_id` values
→ Run backfill if needed

---

**Note:** Make sure "Disable cache" is checked in Network tab (which I can see is already checked ✅)
