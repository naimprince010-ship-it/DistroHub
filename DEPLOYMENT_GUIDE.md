# DistroHub Deployment Guide

## ✅ Verification Summary

### Code Fixes Completed:
1. ✅ **Supabase Database Methods Added** - Category, Supplier, and Unit CRUD operations
2. ✅ **Frontend API Integration** - Categories now persist to database
3. ✅ **Datetime Handling** - Proper conversion for Supabase timestamps
4. ✅ **Error Handling** - Comprehensive logging and error messages

### Files Modified:
- `distrohub-backend/app/supabase_db.py` - Added missing database methods
- `distrohub-frontend/src/pages/Settings.tsx` - Already has API integration

---

## 🚀 Deployment Instructions

### Option 1: Deploy Frontend to Vercel (Recommended)

#### Step 1: Prepare for Deployment
```bash
cd distrohub-frontend
npm install
npm run build
```

#### Step 2: Deploy via Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
cd distrohub-frontend
vercel --prod
```

#### Step 3: Configure Environment Variables in Vercel
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:
```
VITE_API_URL=https://your-backend-url.com
```

#### Step 4: Deploy via GitHub (Alternative)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. Add environment variables
7. Click "Deploy"

---

### Option 2: Deploy Backend

#### Option A: Deploy to Railway
```bash
cd distrohub-backend

# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set USE_SUPABASE=true
railway variables set SUPABASE_URL=your_supabase_url
railway variables set SUPABASE_KEY=your_supabase_key

# Deploy
railway up
```

#### Option B: Deploy to Render
1. Go to [render.com](https://render.com)
2. Create new "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `USE_SUPABASE=true`
   - `SUPABASE_URL=your_url`
   - `SUPABASE_KEY=your_key`
6. Deploy

#### Option C: Deploy to Fly.io
```bash
cd distrohub-backend

# Install Fly CLI
# Windows: https://fly.io/docs/hands-on/install-flyctl/

# Login
fly auth login

# Initialize
fly launch

# Set secrets
fly secrets set USE_SUPABASE=true
fly secrets set SUPABASE_URL=your_url
fly secrets set SUPABASE_KEY=your_key

# Deploy
fly deploy
```

---

## 🔧 Pre-Deployment Checklist

### Backend:
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] Environment variables configured
- [ ] Database tables created in Supabase
- [ ] CORS configured for frontend domain
- [ ] API endpoints tested locally

### Frontend:
- [ ] Dependencies installed (`npm install`)
- [ ] Build successful (`npm run build`)
- [ ] Environment variables set (`VITE_API_URL`)
- [ ] API URL points to backend
- [ ] No console errors

### Database (Supabase):
- [ ] Supabase project created
- [ ] Database schema applied (run `schema.sql`)
- [ ] RLS policies configured (if needed)
- [ ] API keys generated

---

## 📝 Environment Variables

### Frontend (.env or Vercel)
```env
VITE_API_URL=https://your-backend-url.com
```

### Backend (.env or hosting platform)
```env
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

---

## 🧪 Post-Deployment Testing

### 1. Test Frontend
- [ ] Frontend loads without errors
- [ ] Login works
- [ ] Navigation works
- [ ] API calls are successful

### 2. Test Category Persistence
- [ ] Navigate to Settings > Categories
- [ ] Click "Add Category"
- [ ] Fill form and submit
- [ ] Category appears in list
- [ ] Refresh page - category still visible ✅

### 3. Check Console Logs
Open browser console and verify:
```
[CategoryManagement] Component mounted, fetching categories...
[CategoryManagement] Categories fetched successfully: [...]
[CategoryManagement] Category created successfully: {...}
```

### 4. Check Network Tab
- POST `/api/categories` → 200 OK
- GET `/api/categories` → 200 OK with category data

---

## 🐛 Troubleshooting

### Frontend Issues:
**Problem**: API calls failing
- **Solution**: Check `VITE_API_URL` is correct
- **Solution**: Verify CORS is configured on backend

**Problem**: Build fails
- **Solution**: Run `npm install` again
- **Solution**: Check for TypeScript errors

### Backend Issues:
**Problem**: Database connection fails
- **Solution**: Verify Supabase credentials
- **Solution**: Check if tables exist in Supabase

**Problem**: Categories not persisting
- **Solution**: Verify `USE_SUPABASE=true` is set
- **Solution**: Check backend logs for errors

---

## 📊 Deployment URLs

After deployment, you'll get:
- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `https://your-backend.railway.app` (or your hosting)

Update frontend `VITE_API_URL` to point to backend URL.

---

## ✅ Verification Script

Run this after deployment to verify everything works:

```bash
# Test backend
curl https://your-backend-url.com/healthz

# Should return: {"status":"ok"}
```

---

## 🎉 Success Criteria

✅ Frontend deploys successfully  
✅ Backend deploys successfully  
✅ Categories can be created  
✅ Categories persist after page refresh  
✅ No console errors  
✅ API calls return 200 status  

---

## 📞 Support

If you encounter issues:
1. Check deployment logs
2. Verify environment variables
3. Test API endpoints directly
4. Check browser console for errors
5. Verify database connection

---

**Deployment Status**: ✅ Ready for Deployment

All code fixes are complete and tested. The category persistence issue is resolved.

