# ✅ Backend URL Ready - Vercel Update Steps

## 🌐 Backend URL:
```
https://distrohub-backend.onrender.com
```

## 🟢 Step 1: Vercel Dashboard এ Update করুন

### Vercel Environment Variable Update:

1. **Vercel Dashboard** → https://vercel.com/dashboard
2. আপনার **Frontend Project** select করুন
3. **Settings** → **Environment Variables** tab
4. `VITE_API_URL` variable খুঁজুন:
   - যদি **exists** → **Edit** করুন
   - যদি **নেই** → **Add New** click করুন
5. **Value** update করুন:
   ```
   https://distrohub-backend.onrender.com
   ```
6. **Environment**: সব select করুন:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
7. **Save** করুন

---

## 🔄 Step 2: Frontend Redeploy করুন

**Important**: Environment variable change করার পর **redeploy** করতে হবে!

### Option A: Automatic Redeploy
- Vercel automatically detect করবে changes
- নতুন deployment start হবে

### Option B: Manual Redeploy
1. **Deployments** tab
2. Latest deployment → **"..."** menu
3. **Redeploy** click করুন

---

## ✅ Step 3: Verification

### Backend Test:
Browser এ open করুন:
```
https://distrohub-backend.onrender.com/healthz
```
Should return: `{"status":"ok"}`

### Frontend Test:
1. Frontend URL এ যান (Vercel থেকে)
2. **Login** করুন
3. **Settings** → **Categories** tab
4. **"Add Category"** click করুন
5. Category add করুন:
   - Name: "Test Category"
   - Description: "Test"
6. **Submit** করুন
7. **Page refresh** করুন (F5)
8. ✅ **Category persist হওয়া check করুন**

---

## 📋 Checklist

- [x] Backend deployed on Render
- [x] Backend URL: `https://distrohub-backend.onrender.com`
- [ ] Vercel environment variable updated
- [ ] Frontend redeployed
- [ ] Backend health check passed
- [ ] Frontend category persistence tested

---

## 🎯 Quick Summary

1. ✅ Backend: `https://distrohub-backend.onrender.com` (Ready)
2. ⏭️ Vercel → Settings → Environment Variables
3. ⏭️ `VITE_API_URL` = `https://distrohub-backend.onrender.com`
4. ⏭️ Redeploy frontend
5. ⏭️ Test category persistence ✅

---

**Next**: Vercel Dashboard → Environment Variables → Update করুন → Redeploy করুন!

