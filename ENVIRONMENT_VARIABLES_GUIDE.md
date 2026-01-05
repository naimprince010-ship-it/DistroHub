# Environment Variables কোথায় Add করবেন

## 🔵 Backend Environment Variables → Railway এ

**Railway Dashboard** এ এই variables add করুন (Backend এর জন্য):

```
USE_SUPABASE = true
SUPABASE_URL = আপনার Supabase URL
SUPABASE_KEY = আপনার Supabase Key
```

### কিভাবে Add করবেন:
1. Railway Dashboard → আপনার **Backend Project** select করুন
2. **Variables** tab এ যান
3. **"New Variable"** বা **"Add Variable"** click করুন
4. একে একে add করুন:
   - Name: `USE_SUPABASE`, Value: `true`
   - Name: `SUPABASE_URL`, Value: `https://your-project.supabase.co`
   - Name: `SUPABASE_KEY`, Value: `your-anon-key`
5. **Save** করুন

---

## 🟢 Frontend Environment Variables → Vercel এ

**Vercel Dashboard** এ এই variable add করুন (Frontend এর জন্য):

```
VITE_API_URL = https://your-backend.railway.app
```

### কিভাবে Add করবেন:
1. Vercel Dashboard → আপনার **Frontend Project** select করুন
2. **Settings** → **Environment Variables** এ যান
3. **Add New** click করুন
4. Add করুন:
   - Name: `VITE_API_URL`
   - Value: `https://your-backend.railway.app` (Railway থেকে পাওয়া URL)
   - Environment: **Production, Preview, Development** (সব select করুন)
5. **Save** করুন
6. **Redeploy** করুন (important!)

---

## 📋 Summary

| Variable | কোথায় Add | Purpose |
|----------|------------|---------|
| `USE_SUPABASE` | **Railway** | Backend database config |
| `SUPABASE_URL` | **Railway** | Backend database config |
| `SUPABASE_KEY` | **Railway** | Backend database config |
| `VITE_API_URL` | **Vercel** | Frontend API connection |

---

## ✅ Quick Checklist

### Railway (Backend):
- [ ] `USE_SUPABASE=true` added
- [ ] `SUPABASE_URL` added
- [ ] `SUPABASE_KEY` added

### Vercel (Frontend):
- [ ] `VITE_API_URL` = Railway backend URL added
- [ ] Frontend redeployed after adding variable

---

**Important**: 
- **Backend variables** → Railway এ (backend code use করবে)
- **Frontend variables** → Vercel এ (frontend code use করবে)

