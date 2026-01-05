# Railway Variables Add করার পর কি করবেন

## ✅ Step 1: Backend Deploy Check করুন

Railway automatically deploy করবে। Check করুন:

1. Railway Dashboard → আপনার Project
2. **Deployments** tab এ যান
3. Latest deployment check করুন:
   - ✅ **Success** হলে → Next step
   - ❌ **Failed** হলে → Logs check করুন

---

## 🌐 Step 2: Backend URL পাওয়া

1. Railway Dashboard → আপনার Project
2. **Settings** → **Domains** section
3. URL copy করুন (যেমন):
   ```
   https://distrohub-backend-production.up.railway.app
   ```
   অথবা
   ```
   https://your-project-name.railway.app
   ```

---

## 🟢 Step 3: Vercel Frontend এ URL Add করুন

### Vercel Dashboard:
1. https://vercel.com/dashboard → আপনার Frontend Project
2. **Settings** → **Environment Variables**
3. **Add New** click করুন
4. Add করুন:
   - **Name**: `VITE_API_URL`
   - **Value**: Railway থেকে পাওয়া backend URL
     ```
     https://your-backend.railway.app
     ```
   - **Environment**: Production, Preview, Development (সব select করুন)
5. **Save** করুন

---

## 🔄 Step 4: Frontend Redeploy করুন

**Important**: Environment variable add করার পর **redeploy** করতে হবে!

1. Vercel Dashboard → আপনার Project
2. **Deployments** tab
3. Latest deployment → **"..."** menu → **Redeploy**
   অথবা
4. **Deployments** → **"Redeploy"** button

---

## ✅ Step 5: Test করুন

### Backend Test:
Browser এ open করুন:
```
https://your-backend.railway.app/healthz
```
Should return: `{"status":"ok"}`

### Frontend Test:
1. Frontend URL এ যান
2. Login করুন
3. Settings → Categories
4. Category add করুন
5. Page refresh করুন
6. Category persist হওয়া check করুন ✅

---

## 📋 Checklist

- [ ] Railway variables added (USE_SUPABASE, SUPABASE_URL, SUPABASE_KEY)
- [ ] Railway deployment successful
- [ ] Backend URL copied from Railway
- [ ] Vercel environment variable added (VITE_API_URL)
- [ ] Frontend redeployed
- [ ] Backend health check passed
- [ ] Frontend category persistence tested

---

## 🎯 Quick Summary

1. ✅ Railway variables → Done
2. ⏭️ Get Railway backend URL
3. ⏭️ Vercel এ `VITE_API_URL` add করুন
4. ⏭️ Frontend redeploy করুন
5. ⏭️ Test করুন

---

**Next**: Railway Dashboard → Settings → Domains → URL copy করুন → Vercel এ add করুন

