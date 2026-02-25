# Desktop-এ DistroHub Install করার Guide

## 🖥️ Windows (Chrome/Edge) - সবচেয়ে সহজ

### Method 1: Address Bar থেকে

1. **Browser খুলুন** (Chrome বা Edge)
2. **Go to:** https://distrohub-frontend.vercel.app
3. **Address bar-এর ডানদিকে** দেখবেন:
   - **"+"** icon (Install icon)
   - অথবা **"Install"** button
4. **Click করুন** → "Install DistroHub"
5. **Confirmation dialog** আসবে → "Install" confirm করুন
6. **Done!** Desktop-এ shortcut তৈরি হবে

### Method 2: Settings Menu থেকে

1. **Browser-এ app খুলুন**
2. **Settings menu (⋮)** click করুন (top-right corner)
3. **"Install DistroHub"** option দেখবেন
4. **Click করুন** → Install হবে

---

## 🍎 Mac (Chrome/Safari)

### Chrome:
1. **Go to:** https://distrohub-frontend.vercel.app
2. **Address bar-এ** "+" icon দেখবেন
3. **Click করুন** → "Install DistroHub"
4. **Applications folder-এ** যোগ হবে

### Safari:
1. **Go to:** https://distrohub-frontend.vercel.app
2. **File menu** → **"Add to Dock"**
3. অথবা **Share button (□↑)** → **"Add to Home Screen"**

---

## 🐧 Linux (Chrome/Edge)

1. **Go to:** https://distrohub-frontend.vercel.app
2. **Address bar-এ** "+" icon
3. **Click করুন** → "Install DistroHub"
4. **Applications menu-এ** যোগ হবে

---

## 📱 Mobile-এ Install (Bonus)

### Android (Chrome):
1. Browser-এ app খুলুন
2. **Menu (⋮)** → **"Add to Home screen"**
3. Icon name দিন: "DistroHub"
4. **"Add"** click করুন
5. Home screen-এ icon দেখা যাবে

### iOS (Safari):
1. Safari-এ app খুলুন
2. **Share button (□↑)** click করুন
3. **"Add to Home Screen"** select করুন
4. Icon name দিন: "DistroHub"
5. **"Add"** click করুন
6. Home screen-এ icon দেখা যাবে

---

## ✅ Install করার পর

### Desktop-এ:
- ✅ **Desktop shortcut** তৈরি হবে
- ✅ **Start Menu-এ** যোগ হবে (Windows)
- ✅ **Standalone window** - Browser-এর মতো নয়
- ✅ **Offline support** - Internet ছাড়াও কাজ করবে

### Mobile-এ:
- ✅ **Home screen icon** তৈরি হবে
- ✅ **Full screen app** - Browser UI নেই
- ✅ **Offline support** - Cached data কাজ করবে

---

## 🔍 Install Button দেখা যাচ্ছে না?

### Solution 1: Hard Refresh
- Press: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

### Solution 2: Check HTTPS
- PWA শুধু HTTPS-এ কাজ করে
- URL check করুন: `https://distrohub-frontend.vercel.app`

### Solution 3: Browser Update
- Latest Chrome/Edge ব্যবহার করুন
- Old browser-এ PWA support নাও থাকতে পারে

### Solution 4: Check Deployment
- Vercel deployment complete হয়েছে কিনা check করুন
- Manifest file আছে কিনা verify করুন

---

## 🧪 Quick Test

1. **Go to:** https://distrohub-frontend.vercel.app
2. **F12** press করুন (DevTools)
3. **Application tab** → **Manifest** section
4. Manifest file দেখবেন → PWA configured ✅
5. **Service Workers** section → Service worker registered ✅

---

## 📋 Checklist

- [ ] Browser: Chrome/Edge (latest version)
- [ ] URL: HTTPS (not HTTP)
- [ ] Deployment: Vercel deployment complete
- [ ] Manifest: Present and valid
- [ ] Icons: PNG files present

---

## 🚀 After Install

1. **Desktop shortcut** থেকে app খুলুন
2. **Standalone window** দেখবেন (browser-এর মতো নয়)
3. **Offline mode** test করুন
4. **Auto-update** - নতুন version automatically update হবে

---

**Status:** সব ready! Browser-এ গিয়ে Install button click করুন! 🎉
