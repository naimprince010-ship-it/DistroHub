# VITE_API_URL কোথায় পাবেন এবং কিভাবে সেট করবেন

## 📍 বর্তমান Configuration

আপনার `.env` ফাইলে এখন আছে:
```
VITE_API_URL=https://distrohub-backend.vercel.app
```

**ফাইল অবস্থান**: `distrohub-frontend/.env`

---

## 🔧 কিভাবে পরিবর্তন করবেন

### Local Development (লোকালে কাজ করার জন্য):

**ফাইল**: `distrohub-frontend/.env.local` (আমি তৈরি করে দিয়েছি)

```env
VITE_API_URL=http://localhost:8000
```

### Production (Vercel এ deploy করার জন্য):

**Option 1: Vercel Dashboard**
1. https://vercel.com/dashboard এ যান
2. আপনার project select করুন
3. **Settings** → **Environment Variables**
4. `VITE_API_URL` variable খুঁজুন বা add করুন
5. Value: `https://your-backend-url.com`
6. **Save** → **Redeploy**

**Option 2: .env file (local)**
```env
VITE_API_URL=https://your-backend-url.com
```

---

## 🌐 Backend URL কোথায় পাবেন?

### যদি Backend deploy করেন:

**Railway:**
- Dashboard → Your App → Settings → Domains
- URL: `https://your-app.railway.app`

**Render:**
- Dashboard → Your Service → Settings
- URL: `https://your-app.onrender.com`

**Fly.io:**
- Dashboard → Your App
- URL: `https://your-app.fly.dev`

**Vercel (Backend):**
- Dashboard → Your Project
- URL: `https://your-project.vercel.app`

---

## ✅ Quick Check

### কোথায় use হচ্ছে:
**File**: `distrohub-frontend/src/lib/api.ts`
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

### Browser Console এ check করুন:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

---

## 📝 Important

1. **Local**: `.env.local` file use করুন
2. **Production**: Vercel dashboard এ environment variable set করুন
3. **Change করার পর**: Dev server restart করুন
4. **Vercel**: Environment variable change করার পর redeploy করুন

---

## 🚀 Current Setup

✅ `.env` file আছে: `distrohub-frontend/.env`
✅ Value: `https://distrohub-backend.vercel.app`
✅ `.env.local` তৈরি করা হয়েছে local development এর জন্য

**আপনার backend URL টি কি?** সেটা `.env` file এ update করুন।

