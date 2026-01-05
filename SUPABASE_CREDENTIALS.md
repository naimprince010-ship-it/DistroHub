# Supabase URL এবং Key কোথায় পাবেন

## 📍 Supabase Dashboard থেকে Credentials পাওয়ার উপায়

### Step 1: Supabase Dashboard এ যান
1. https://supabase.com/dashboard এ login করুন
2. আপনার project select করুন (যেমন: `llucnnzcslnulnyzourx`)

### Step 2: Project Settings এ যান
1. Left sidebar → **Settings** (⚙️ icon)
2. **API** section এ click করুন

### Step 3: Credentials পাওয়া

#### SUPABASE_URL:
- **Project URL** section এ দেখবেন
- Format: `https://llucnnzcslnulnyzourx.supabase.co`
- এই URL টি copy করুন

#### SUPABASE_KEY:
দুই ধরনের key আছে:

1. **anon/public key** (Frontend/Backend এর জন্য):
   - **Project API keys** section
   - **anon** বা **public** key
   - এই key টি use করুন (সাধারণত সবচেয়ে দীর্ঘ)

2. **service_role key** (Backend only - Admin access):
   - **service_role** key
   - ⚠️ শুধু backend এ use করুন, frontend এ নয়

### Step 4: Railway এ Add করুন

Railway Dashboard → Your Project → Variables:

```
SUPABASE_URL = https://llucnnzcslnulnyzourx.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key)
```

---

## 🔍 Alternative: Connection String থেকে

যদি আপনি Connection String দেখেন (যেমন image এ দেখেছিলেন):

```
postgresql://postgres.llucnnzcslnulnyzourx:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

এখান থেকে:
- **SUPABASE_URL**: `https://llucnnzcslnulnyzourx.supabase.co`
- **SUPABASE_KEY**: Settings → API → anon key

---

## 📋 Quick Checklist

- [ ] Supabase Dashboard → Settings → API
- [ ] Project URL copy করুন → `SUPABASE_URL`
- [ ] anon/public key copy করুন → `SUPABASE_KEY`
- [ ] Railway → Variables → Add করুন

---

## ⚠️ Important Notes

1. **anon key** use করুন (service_role নয়)
2. Key টি **secret** - কখনো public করে share করবেন না
3. Railway এ add করার সময় **exact value** copy করুন (space/line break নেই)

---

**Location**: Supabase Dashboard → Settings → API → Project URL & API Keys

