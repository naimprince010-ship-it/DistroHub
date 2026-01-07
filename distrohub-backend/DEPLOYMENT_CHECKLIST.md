# 🚀 Sales Return Deployment Checklist

## ✅ Step 1: Supabase Migration (CRITICAL - Do First!)

### Option A: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard:**
   - URL: https://supabase.com/dashboard
   - Login with your credentials
   - Select your project

2. **Navigate to SQL Editor:**
   - Left sidebar → **SQL Editor**
   - Click **"New Query"**

3. **Copy and Paste This SQL:**

```sql
-- Sales Returns Migration
-- Creates tables for handling partial/full sales returns
-- Ensures audit trail and proper inventory/due adjustments

-- Sales Returns table
CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(100) NOT NULL UNIQUE,
    sale_id UUID REFERENCES sales(id) NOT NULL,
    retailer_id UUID REFERENCES retailers(id) NOT NULL,
    retailer_name VARCHAR(255) NOT NULL,
    total_return_amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    refund_type VARCHAR(50) DEFAULT 'adjust_due',
    status VARCHAR(50) DEFAULT 'completed',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Return Items table
CREATE TABLE IF NOT EXISTS sales_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
    sale_item_id UUID REFERENCES sale_items(id) NOT NULL,
    product_id UUID REFERENCES products(id) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    batch_id UUID REFERENCES product_batches(id),
    quantity_returned INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    total_returned DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_returns_sale_id ON sales_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_retailer_id ON sales_returns(retailer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_return_number ON sales_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_return_id ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_sale_item_id ON sales_return_items(sale_item_id);

-- Add comment
COMMENT ON TABLE sales_returns IS 'Records for sales returns/credit notes. Original sales remain immutable for audit.';
COMMENT ON TABLE sales_return_items IS 'Individual items returned from a sale. Links to original sale_items.';
```

4. **Click "Run" button**
5. **Verify Success:** You should see "Success. No rows returned" or similar

### Option B: Supabase CLI (If you have CLI installed)

```bash
supabase db push
```

---

## ✅ Step 2: Render Deployment Check

### Check if Auto-Deploy Happened:

1. **Go to Render Dashboard:**
   - URL: https://dashboard.render.com
   - Login with GitHub/Email

2. **Find Your Service:**
   - Look for **"distrohub-backend"** service
   - Click on it

3. **Check Deployment Status:**
   - Go to **"Events"** or **"Deployments"** tab
   - Latest deployment should show:
     - ✅ **Status: "Live"** (green)
     - ✅ **Commit:** `Add Sales Return API endpoints and database support`
     - ✅ **Deployed at:** (recent timestamp)

4. **If NOT Deployed or Failed:**
   - Click **"Manual Deploy"** button
   - Select **"Deploy latest commit"**
   - Wait 5-10 minutes for deployment

### Verify Backend Endpoints:

After deployment, test these URLs:

1. **Health Check:**
   ```
   https://distrohub-backend.onrender.com/healthz
   ```
   Should return: `{"status":"ok"}`

2. **API Docs (Optional):**
   ```
   https://distrohub-backend.onrender.com/docs
   ```
   Should show FastAPI Swagger UI

---

## ✅ Step 3: Test Return API Endpoints

### Using Browser Console (After Login):

```javascript
// Test GET returns endpoint
const token = localStorage.getItem('token');
const saleId = 'YOUR_SALE_ID'; // Get from sales list

fetch(`https://distrohub-backend.onrender.com/api/sales/${saleId}/returns`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => console.log('Returns:', data));
```

### Expected Response:

- **If no returns:** `[]` (empty array)
- **If tables don't exist:** `500 Internal Server Error`
- **If endpoint doesn't exist:** `404 Not Found`

---

## ✅ Step 4: Frontend Integration (Future)

Once backend is working, you'll need to:
1. Add "Return" button in Sales page
2. Create Return modal/form
3. Call POST `/api/sales/{sale_id}/return` endpoint
4. Refresh sales list after return

---

## 🐛 Troubleshooting

### Problem: Endpoint returns 404

**Solution:**
- Check Render deployment status
- Ensure code was pushed to GitHub `main` branch
- Wait 5-10 minutes after push for auto-deploy

### Problem: Endpoint returns 500 (Database Error)

**Solution:**
- Run Supabase migration (Step 1)
- Check Supabase logs for errors
- Verify tables exist in Supabase Dashboard → Table Editor

### Problem: Tables already exist error

**Solution:**
- Migration uses `CREATE TABLE IF NOT EXISTS` - safe to run again
- Or check if tables exist: Supabase Dashboard → Table Editor → Look for `sales_returns` and `sales_return_items`

---

## 📋 Quick Status Check

- [ ] Supabase migration run successfully
- [ ] Render deployment status: "Live"
- [ ] Backend health check: `{"status":"ok"}`
- [ ] GET `/api/sales/{id}/returns` returns 200 (empty array) or 404
- [ ] POST `/api/sales/{id}/return` endpoint exists (test in Swagger UI)

---

## 🔗 Useful Links

- **Backend URL:** https://distrohub-backend.onrender.com
- **Frontend URL:** https://distrohub-frontend.vercel.app
- **Render Dashboard:** https://dashboard.render.com
- **Supabase Dashboard:** https://supabase.com/dashboard
- **GitHub Repo:** https://github.com/naimprince010-ship-it/DistroHub

---

**Last Updated:** 2026-01-06
**Migration File:** `supabase/migrations/20260106010000_create_sales_returns.sql`

