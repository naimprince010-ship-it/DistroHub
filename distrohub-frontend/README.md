# DistroHub Frontend

Web frontend for DistroHub, built with React, TypeScript, and Vite.

## Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS + Radix UI
- TanStack Query + TanStack Virtual
- IndexedDB offline queue (`idb`)

## Run Locally

```bash
npm install
npm run dev
```

Default backend URL fallback is `http://localhost:8001` in development when `VITE_API_URL` is not set.

## Build

```bash
npm run build
```

## QA Commands

```bash
npx eslint "src/components/BarcodeScanner.tsx"
npm run build
```

Note: Full-repo lint currently includes historical lint debt in many files; use targeted lint checks for touched modules during incremental rollout.

## Release Docs

- Rollout checklist: [`ROLLOUT_CHECKLIST.md`](./ROLLOUT_CHECKLIST.md)
- Change log: [`CHANGELOG.md`](./CHANGELOG.md)
