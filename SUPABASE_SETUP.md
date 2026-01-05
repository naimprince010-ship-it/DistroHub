# Supabase Credentials Setup

## 🎯 কোথায় পাবেন

### SUPABASE_URL:
1. Supabase Dashboard: https://supabase.com/dashboard
2. আপনার project select করুন
3. **Settings** → **API**
4. **Project URL** section:
   ```
   https://llucnnzcslnulnyzourx.supabase.co
   ```
   এই URL টি copy করুন

### SUPABASE_KEY:
1. Same page (Settings → API)
2. **Project API keys** section
3. **anon** বা **public** key copy করুন
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
   - ⚠️ **anon key** use করুন, **service_role** নয়

---

## 📝 Railway এ Add করার Format

Railway Dashboard → Variables:

| Name | Value |
|------|-------|
| `USE_SUPABASE` | `true` |
| `SUPABASE_URL` | `https://llucnnzcslnulnyzourx.supabase.co` |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon key) |

---

## 🔗 Direct Link

Supabase Dashboard:
- Settings: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
- Replace `YOUR_PROJECT_ID` with your project ID

---

**Tip**: Image এ যে connection string দেখেছিলেন, সেখান থেকে project ID পাওয়া যায়: `llucnnzcslnulnyzourx`

