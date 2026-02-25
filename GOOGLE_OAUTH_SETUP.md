# Google Cloud Console – Gmail OAuth সেটআপ গাইড

Supabase-এ Gmail দিয়ে লগইন চালু করতে Google Cloud Console থেকে OAuth Client ID ও Secret বের করতে হবে। ধাপে ধাপে কী করবেন:

---

## ধাপ ১: Google Cloud Console খুলা

1. ব্রাউজারে যান: **https://console.cloud.google.com**
2. যে Gmail দিয়ে চালাবেন সেই দিয়ে **Sign in** করুন।

---

## ধাপ ২: নতুন প্রজেক্ট তৈরি (অথবা আগের প্রজেক্ট ব্যবহার)

### নতুন প্রজেক্ট বানাতে:
1. উপরে **Select a project** ক্লিক করুন।
2. **New Project** বাটনে ক্লিক করুন।
3. **Project name** দিন, যেমন: `Interactive Narrative Engine` বা `My App`।
4. **Create** ক্লিক করুন।
5. প্রজেক্ট সিলেক্ট হয়ে গেলে পরের ধাপে যান।

### আগের / existing প্রজেক্ট ব্যবহার করতে:
- **Select a project** থেকে সেই প্রজেক্ট সিলেক্ট করুন।

---

## ধাপ ৩: OAuth consent screen কনফিগার করা

1. বাম পাশের মেনুতে **APIs & Services** → **OAuth consent screen**।
2. **User Type** বেছে নিন:
   - **External** – যেকোনো Gmail দিয়ে লগইন (সাধারণভাবে এটাই নেবেন)
   - **Internal** – শুধু আপনার organization-এর গুগল অ্যাকাউন্ট (Workspace)

3. **Create** ক্লিক করুন।

### App information:
- **App name:** আপনার অ্যাপের নাম (যেমন: `Interactive Narrative Engine`)
- **User support email:** আপনার ইমেইল সিলেক্ট করুন
- **App logo:** (optional) স্কিপ করতে পারবেন

### App domain (optional এখনই):
- **Application home page:** `https://narrativeengine.vercel.app`
- **Application privacy policy:** আপনার privacy policy লিংক (নেইলে পরে দেবেন)
- **Application terms of service:** (optional)

### Developer contact:
- **Developer contact information:** আপনার ইমেইল দিন।

4. **Save and Continue** ক্লিক করুন।

### Scopes:
1. **Add or remove scopes** ক্লিক করুন।
2. নিচের scope গুলো খুঁজে যোগ করুন:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
3. **Update** → **Save and Continue**।

### Test users (শুধু **Testing** mode থাকলে):
- আপনার অ্যাপ **Testing** এ থাকলে কেবল যাদের ইমেইল দেবেন তারাই লগইন পারবে।
- **Add users** দিয়ে টেস্ট করার ইমেইলগুলো যোগ করুন।
- **Save and Continue**।

5. **Back to Dashboard** ক্লিক করুন।
   OAuth consent screen সেটআপ সম্পন্ন।

---

## ধাপ ৪: OAuth 2.0 Client ID তৈরি

1. বাম মেনু: **APIs & Services** → **Credentials**।
2. ওপরে **+ Create Credentials** ক্লিক করুন।
3. **OAuth client ID** সিলেক্ট করুন।

### Application type:
- **Web application** বেছে নিন।

### Name:
- যেমন: `Supabase Gmail Login` বা `Narrative Engine Web`।

### Authorized JavaScript origins:
এগুলো যোগ করুন (প্রতি লাইনে একটি):

```
https://narrativeengine.vercel.app
https://ysgzjoyffzlxlbjxswso.supabase.co
```

**Localhost এ টেস্ট করলে** আরো যোগ করুন:

```
http://localhost:3000
```

### Authorized redirect URIs:
এখানে **Supabase-এর callback URL** অবশ্যই দিতে হবে:

```
https://ysgzjoyffzlxlbjxswso.supabase.co/auth/v1/callback
```

**নোট:**
- `ysgzjoyffzlxlbjxswso` আপনার Supabase project ID।
- Supabase Dashboard → **Settings** → **API** থেকে Project URL দেখে নিতে পারবেন।
  উদাহরণ: `https://ysgzjoyffzlxlbjxswso.supabase.co`

4. **Create** ক্লিক করুন।

---

## ধাপ ৫: Client ID ও Client Secret কপি করা

একটা পপআপে দেখাবে:

- **Client ID:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client secret:** `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`

1. **Client ID** কপি করুন।
2. **Client secret** কপি করুন।
   (পরে আবার দেখতে: **Credentials** → আপনার OAuth client → **Edit**)

এ দুটোই **Supabase**-এ দেবেন।

---

## ধাপ ৬: Supabase-এ Google Provider কনফিগার করা

1. **Supabase Dashboard:** https://supabase.com/dashboard
2. আপনার প্রজেক্ট সিলেক্ট করুন (যে প্রজেক্ট narrative engine use করছে)।
3. বাম পাশে **Authentication** → **Providers**।
4. **Google** খুঁজে ক্লিক করুন।
5. **Enable Sign in with Google** চালু করুন।
6. **Client ID (for OAuth):** এখানে Google এর **Client ID** পেস্ট করুন।
7. **Client Secret (for OAuth):** এখানে **Client Secret** পেস্ট করুন।
8. **Save** ক্লিক করুন।

---

## ধাপ ৭: Site URL ও Redirect URLs (Supabase)

1. **Authentication** → **URL Configuration**।
2. **Site URL:**
   - Production: `https://narrativeengine.vercel.app`
   - Local টেস্ট: `http://localhost:3000`
3. **Redirect URLs**-এ নিচেরগুলো যোগ করুন:
   ```
   https://narrativeengine.vercel.app/dashboard
   https://narrativeengine.vercel.app/**
   http://localhost:3000/dashboard
   http://localhost:3000/**
   ```
4. **Save** করুন।

---

## চেকলিস্ট

| কাজ | করা হয়েছে? |
|-----|-------------|
| Google Cloud এ প্রজেক্ট তৈরি | ☐ |
| OAuth consent screen (External + Scopes) | ☐ |
| Web application OAuth Client ID | ☐ |
| Authorized JS origins (আপনার site + Supabase URL) | ☐ |
| Redirect URI = `...supabase.co/auth/v1/callback` | ☐ |
| Supabase → Google Provider → Client ID + Secret | ☐ |
| Supabase Site URL + Redirect URLs | ☐ |

---

## সাধারণ সমস্যা ও সমাধান

### ১. "Redirect URI mismatch"
- Google Console-এ **Authorized redirect URIs**-এ `https://ysgzjoyffzlxlbjxswso.supabase.co/auth/v1/callback` ঠিকমতো আছে কিনা দেখুন।
- Project ID (`ysgzjoyffzlxlbjxswso`) আপনার Supabase প্রজেক্টের সাথে মিলছে কিনা চেক করুন।

### ২. "Access blocked: This app's request is invalid"
- OAuth consent screen সেটআপ করা হয়েছে কিনা দেখুন।
- **Scopes**-এ `email`, `profile`, `openid` আছে কিনা চেক করুন।

### ৩. শুধু "Test users" দিয়ে লগইন হচ্ছে
- অ্যাপ **Testing** mode-এ থাকলে শুধু added test users লগইন করতে পারবে।
- সবার জন্য চাইলে **OAuth consent screen** → **Publish App** করে **Production** করুন (Google verification প্রক্রিয়া আছে)।

### ৪. Localhost এ কাজ করছে, Vercel এ না
- **Authorized JavaScript origins** ও **Redirect URIs**-এ `https://narrativeengine.vercel.app` এবং `https://narrativeengine.vercel.app/dashboard` যোগ আছে কিনা দেখুন।
- Supabase **Site URL** ও **Redirect URLs**-এ production domain দেওয়া আছে কিনা চেক করুন।

---

## সংক্ষেপ

1. **Google Cloud Console** → প্রজেক্ট → **OAuth consent screen** → **Credentials** → **OAuth client ID (Web)**।
2. **Redirect URI** = `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`।
3. **Client ID** ও **Client Secret** → **Supabase** → **Authentication** → **Providers** → **Google**-এ দেয়া।
4. **Supabase**-এ **Site URL** ও **Redirect URLs** সঠিকভাবে সেট করা।

এগুলো ঠিক থাকলে আপনার সাইটে **Continue with Gmail** দিয়ে লগইন কাজ করবে।
