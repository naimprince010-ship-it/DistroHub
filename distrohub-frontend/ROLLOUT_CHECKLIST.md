# Rollout Checklist (Day 10)

Use this checklist before releasing current frontend changes to production.

## 1) Pre-Deploy Validation

- [ ] Confirm `VITE_API_URL` for target environment.
- [ ] Run `npm install` and ensure lockfile is committed.
- [ ] Run `npm run build` successfully.
- [ ] Smoke-check `Products` page load and refresh behavior.
- [ ] Smoke-check add/edit/delete product flow.
- [ ] Verify barcode scan works in both modes:
  - [ ] ZXing (default)
  - [ ] Quagga2 compatibility mode

## 2) Offline and Sync Validation

- [ ] Create/update/delete product while offline.
- [ ] Reconnect and run sync (manual/auto) from UI.
- [ ] Verify queued actions are cleared after successful sync.
- [ ] Verify repeated failed actions do not retry aggressively (backoff works).
- [ ] Verify non-retryable server validation errors remain visible for manual correction.

## 3) Performance and UX Spot Checks

- [ ] Products table switches to virtualization on large datasets.
- [ ] Pagination remains active for small datasets.
- [ ] Add Product modal opens without metadata lag (prefetch path).
- [ ] No duplicate page titles or broken header layout.

## 4) Release Notes and Handoff

- [ ] Update `CHANGELOG.md` with release date and notes.
- [ ] Share known limitations:
  - Full repository lint still contains historical debt outside touched scope.
  - `exceljs` chunk remains large but lazy-loaded.
- [ ] Communicate rollback plan: revert to last known frontend tag/commit if blocking production issue appears.

## 5) Post-Deploy Monitoring (First 24 Hours)

- [ ] Monitor API error rates for product endpoints.
- [ ] Monitor sync queue growth (should trend down after reconnect).
- [ ] Collect scanner failure feedback by device/browser.
- [ ] Validate no spike in "product not found by barcode" complaints.
