# Payment History Feature - Testing Guide

## 🧪 Testing Steps

### Prerequisites
1. ✅ Backend deployed (Render)
2. ✅ Frontend deployed (Vercel)
3. ✅ Login credentials ready
4. ✅ At least one payment recorded in the system

---

## Test 1: Sales Order Modal - Payment History

### Steps:
1. **Login করুন:**
   - URL: https://distrohub-frontend.vercel.app
   - Email: `admin@distrohub.com`
   - Password: `admin123`

2. **Sales Orders page-এ যান:**
   - Sidebar → "Sales Orders" click করুন

3. **Edit Order Modal খুলুন:**
   - কোনো order-এর row-এ **Edit** icon (✏️) click করুন
   - অথবা order click করুন

4. **Payment History check করুন:**
   - Modal-এ scroll down করুন
   - "Payment History" section দেখবেন
   - Expected:
     - ✅ Payment amount (৳)
     - ✅ Date/Time
     - ✅ Payment method (Cash/Bank/Mobile)
     - ✅ Collected By (SR name)
     - ✅ Route # (যদি route-এ থাকে)

### Expected Result:
- ✅ Payment History section visible
- ✅ সব payment records দেখাচ্ছে
- ✅ Date, amount, SR name, route number সব ঠিক আছে

---

## Test 2: SR Accountability - Payment History

### Steps:
1. **SR Accountability page-এ যান:**
   - Sidebar → "SR Accountability" click করুন

2. **SR select করুন:**
   - Dropdown থেকে "Jahid Islam" (বা অন্য কোনো SR) select করুন

3. **View Payment History button click করুন:**
   - "Total Collected" card-এ
   - "View Payment History" button দেখবেন
   - Button click করুন

4. **Payment History Modal check করুন:**
   - Modal খুলবে
   - Table format-এ সব payment দেখাবে
   - Columns:
     - Date/Time
     - Invoice #
     - Retailer
     - Amount
     - Method
     - Route #

### Expected Result:
- ✅ Modal খুলছে
- ✅ Table-এ সব payment দেখাচ্ছে
- ✅ Total amount summary দেখাচ্ছে
- ✅ সব columns properly populated

---

## Test 3: Collection Report (Reports Page)

### Steps:
1. **Reports page-এ যান:**
   - Sidebar → "Reports" click করুন

2. **Collection Report tab select করুন:**
   - Top tabs-এ "Collection Report" click করুন

3. **Date Range set করুন:**
   - Start Date: Current month-এর প্রথম দিন
   - End Date: আজকের date

4. **SR Filter (Optional):**
   - "All SRs" dropdown থেকে specific SR select করুন
   - অথবা "All SRs" রাখুন

5. **Payment Table check করুন:**
   - Table-এ সব payment দেখাবে
   - Columns:
     - Date/Time
     - Invoice #
     - Retailer
     - Amount
     - Method
     - Collected By
     - Route #

### Expected Result:
- ✅ Collection Report tab visible
- ✅ Date filter কাজ করছে
- ✅ SR filter কাজ করছে
- ✅ Table-এ সব payment দেখাচ্ছে
- ✅ Summary cards (Total Payments, Total Amount) দেখাচ্ছে

---

## Test 4: Create New Payment & Verify

### Steps:
1. **Sales Orders page-এ যান**

2. **Order select করুন:**
   - কোনো unpaid/partial order select করুন

3. **Payment record করুন:**
   - "টাকা জমা" button click করুন
   - Amount enter করুন
   - Payment method select করুন
   - SR select করুন (Collected By)
   - Submit করুন

4. **Payment History verify করুন:**
   - Same order-এর Edit modal খুলুন
   - Payment History section-এ নতুন payment দেখবেন
   - Date/Time, Amount, SR name সব ঠিক আছে check করুন

### Expected Result:
- ✅ নতুন payment Payment History-তে দেখা যাচ্ছে
- ✅ Date/Time automatically set হয়েছে
- ✅ Collected By SR name দেখাচ্ছে

---

## Test 5: API Direct Test (Browser Console)

### Steps:
1. **Browser DevTools খুলুন:**
   - F12 press করুন
   - Console tab select করুন

2. **Test Sale Payments API:**
   ```javascript
   // Get token
   const token = localStorage.getItem('token');
   
   // Get a sale ID (from Sales Orders page)
   const saleId = 'YOUR_SALE_ID_HERE'; // Replace with actual sale ID
   
   // Fetch payments
   fetch('https://distrohub-backend.onrender.com/api/sales/' + saleId + '/payments', {
     headers: {
       'Authorization': 'Bearer ' + token
     }
   })
   .then(r => r.json())
   .then(data => {
     console.log('Payments:', data);
     console.log('Count:', data.length);
   });
   ```

3. **Test SR Payments API:**
   ```javascript
   // Get SR ID (from SR Accountability dropdown)
   const srId = 'YOUR_SR_ID_HERE'; // Replace with actual SR ID
   
   fetch('https://distrohub-backend.onrender.com/api/users/' + srId + '/payments', {
     headers: {
       'Authorization': 'Bearer ' + token
     }
   })
   .then(r => r.json())
   .then(data => {
     console.log('SR Payments:', data);
     console.log('Total:', data.reduce((sum, p) => sum + p.amount, 0));
   });
   ```

4. **Test Collection Report API:**
   ```javascript
   const fromDate = '2026-01-01';
   const toDate = '2026-01-31';
   
   fetch(`https://distrohub-backend.onrender.com/api/reports/collections?from_date=${fromDate}&to_date=${toDate}`, {
     headers: {
       'Authorization': 'Bearer ' + token
     }
   })
   .then(r => r.json())
   .then(data => {
     console.log('Collection Report:', data);
     console.log('Total Payments:', data.summary?.total_payments);
     console.log('Total Amount:', data.summary?.total_amount);
   });
   ```

### Expected Result:
- ✅ API calls successful (200 OK)
- ✅ Data properly formatted
- ✅ All fields present (amount, collected_by_name, route_number, etc.)

---

## ✅ Testing Checklist

### Sales Order Modal:
- [ ] Payment History section visible
- [ ] Payment records display correctly
- [ ] Date/Time formatted properly
- [ ] SR name shows correctly
- [ ] Route number shows (if applicable)
- [ ] Payment method badge shows

### SR Accountability:
- [ ] "View Payment History" button visible
- [ ] Modal opens correctly
- [ ] Table displays all payments
- [ ] Total amount calculated correctly
- [ ] All columns populated

### Collection Report:
- [ ] Collection Report tab exists
- [ ] Date filter works
- [ ] SR filter works
- [ ] Table displays payments
- [ ] Summary cards show correct totals
- [ ] Invoice numbers display
- [ ] Route numbers display

### Data Accuracy:
- [ ] Payment amounts match database
- [ ] Dates match payment creation time
- [ ] SR names match correctly
- [ ] Route numbers match (if applicable)
- [ ] Invoice numbers match sales

---

## 🐛 Common Issues & Solutions

### Issue: "No payment records found"
**Possible Causes:**
- No payments recorded yet
- Sale ID incorrect
- API error

**Solution:**
- Create a payment first
- Check browser console for errors
- Verify API endpoint is correct

### Issue: "Payment History not loading"
**Possible Causes:**
- Backend not deployed
- API endpoint error
- Network issue

**Solution:**
- Check backend status (Render dashboard)
- Check browser console for errors
- Verify API URL in network tab

### Issue: "SR name not showing"
**Possible Causes:**
- Payment doesn't have `collected_by` set
- User not found in database

**Solution:**
- Check payment record in database
- Verify `collected_by` field is set
- Check if user exists

---

## 📊 Expected Data Format

### Payment Object:
```json
{
  "id": "uuid",
  "amount": 5000.00,
  "payment_method": "cash",
  "created_at": "2026-01-13T10:30:00Z",
  "collected_by_name": "Jahid Islam",
  "route_number": "RT-20260111-6BBA",
  "invoice_number": "INV-20260111-4530",
  "retailer_name": "Retailer Name",
  "notes": "Optional notes"
}
```

---

## 🎯 Quick Test (5 Minutes)

1. ✅ Login → Sales Orders → Edit Order → Check Payment History
2. ✅ SR Accountability → Select SR → View Payment History
3. ✅ Reports → Collection Report → Check table

**If all 3 work → Feature is working! ✅**

---

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________

Test 1 - Sales Order Modal: [ ] Pass [ ] Fail
Test 2 - SR Accountability: [ ] Pass [ ] Fail
Test 3 - Collection Report: [ ] Pass [ ] Fail
Test 4 - New Payment: [ ] Pass [ ] Fail
Test 5 - API Direct: [ ] Pass [ ] Fail

Issues Found:
1. ________________
2. ________________

Overall Status: [ ] Working [ ] Issues Found
```

---

**Ready to test!** Deployment complete হওয়ার পর (2-3 minutes) উপরোক্ত steps follow করুন। 🚀
