# 🔐 Credentials Setup Guide

## ⚠️ IMPORTANT SECURITY NOTICE

- ✅ `credentials.json` is **NEVER** committed to git (in .gitignore)
- ✅ Only `CREDENTIALS_TEMPLATE.json` is in git (safe, no real credentials)
- ⚠️ **NEVER** share your credentials.json file with anyone
- ⚠️ **NEVER** commit credentials.json to git

---

## 📝 How to Setup Credentials

### Step 1: Fill in Your Credentials

Open `credentials.json` file and fill in your actual login information:

```json
{
  "render": {
    "email": "your-email@example.com",
    "password": "your-password",
    "login_method": "GitHub or Email"
  },
  "vercel": {
    "email": "your-email@example.com",
    "login_method": "GitHub"
  },
  "supabase": {
    "email": "your-email@example.com",
    "password": "your-password",
    "project_id": "llucnnzcslnulnyzourx",
    "project_url": "https://llucnnzcslnulnyzourx.supabase.co"
  }
}
```

### Step 2: Verify .gitignore

Make sure `credentials.json` is in `.gitignore` (it should be already):

```bash
# Check if credentials.json is ignored
git check-ignore credentials.json
# Should output: credentials.json
```

### Step 3: Test Credentials (Optional)

After saving, I can use these credentials to:
- Access Render dashboard for deployment
- Access Vercel dashboard for frontend updates
- Access Supabase for database migrations

---

## 🔑 Where to Find Credentials

### Render:
1. Go to: https://dashboard.render.com
2. Login with GitHub or Email
3. Service: `distrohub-backend`

### Vercel:
1. Go to: https://vercel.com/dashboard
2. Login with GitHub
3. Project: `distrohub-frontend`

### Supabase:
1. Go to: https://supabase.com/dashboard
2. Login with Email/Password
3. Project URL: Check your Supabase project

---

## ✅ After Setup

Once credentials are saved in `credentials.json`:

1. ✅ I can access dashboards automatically
2. ✅ I can run deployments
3. ✅ I can execute database migrations
4. ✅ I can check deployment status

**Just tell me: "credentials save kore felo" and I'll use them for future work!**

---

## 🔒 Security Best Practices

- ✅ Credentials file is in .gitignore (safe from git)
- ✅ Template file has no real credentials
- ✅ Only save credentials locally
- ⚠️ If you need to share credentials, use secure methods (password managers, encrypted sharing)

---

**Last Updated:** 2026-01-06

