# VITE_API_URL কোথায় সেট করবেন

## 📍 API URL কোথায় আছে?

API URL টি `distrohub-frontend/src/lib/api.ts` ফাইলে ব্যবহার করা হচ্ছে:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

## 🔧 কিভাবে সেট করবেন

### Option 1: Local Development (.env file)

**ফাইল**: `distrohub-frontend/.env.local`

```env
VITE_API_URL=http://localhost:8000
```

**বা** `distrohub-frontend/.env` ফাইল তৈরি করুন:

```env
VITE_API_URL=http://localhost:8000
```

### Option 2: Vercel Deployment (Environment Variables)

1. Vercel Dashboard এ যান: https://vercel.com/dashboard
2. আপনার project select করুন
3. **Settings** → **Environment Variables** এ যান
4. Add new variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.com` (আপনার backend URL)
   - **Environment**: Production, Preview, Development (সব select করুন)
5. **Save** করুন
6. **Redeploy** করুন

---

## 🌐 Production URL Examples

### যদি Backend Railway এ deploy করেন:
```
VITE_API_URL=https://your-app.railway.app
```

### যদি Backend Render এ deploy করেন:
```
VITE_API_URL=https://your-app.onrender.com
```

### যদি Backend Fly.io এ deploy করেন:
```
VITE_API_URL=https://your-app.fly.dev
```

### যদি Backend অন্য কোনো platform এ deploy করেন:
```
VITE_API_URL=https://your-backend-domain.com
```

---

## ✅ Verification (যাচাইকরণ)

### Local Development:
```bash
cd distrohub-frontend
npm run dev
```

Browser console এ check করুন:
```javascript
console.log(import.meta.env.VITE_API_URL)
// Should show: http://localhost:8000
```

### Production:
Browser console এ check করুন:
```javascript
console.log(import.meta.env.VITE_API_URL)
// Should show your production backend URL
```

---

## 📝 Important Notes

1. **Vite environment variables** `VITE_` prefix দিয়ে শুরু হতে হবে
2. **.env.local** file Git এ commit করবেন না (`.gitignore` এ আছে)
3. **Vercel** এ environment variable set করার পর **redeploy** করতে হবে
4. **Local development** এর জন্য `.env.local` use করুন
5. **Production** এর জন্য Vercel dashboard এ set করুন

---

## 🔍 Current Configuration

**File**: `distrohub-frontend/src/lib/api.ts`

```typescript
// Default: http://localhost:8000 (if VITE_API_URL not set)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

## 🚀 Quick Setup

### Local:
```bash
cd distrohub-frontend
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

### Production (Vercel):
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://your-backend-url.com`
3. Redeploy

---

## ❓ Troubleshooting

**Problem**: API calls failing
- **Solution**: Check if `VITE_API_URL` is set correctly
- **Solution**: Verify backend is running and accessible
- **Solution**: Check CORS settings on backend

**Problem**: Environment variable not working
- **Solution**: Restart dev server after changing .env
- **Solution**: Make sure variable name starts with `VITE_`
- **Solution**: Clear browser cache

---

**Status**: ✅ Ready to configure

