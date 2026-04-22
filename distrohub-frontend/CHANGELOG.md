# Changelog

All notable frontend changes are documented in this file.

## 2026-04-22

### Added

- Product query key factory in `src/lib/queryKeys.ts` for consistent cache keys.
- Quagga2 compatibility scanner fallback in `src/components/BarcodeScanner.tsx`.
- Retry metadata for offline queue records (`attempts`, `nextRetryAt`, `lastError`).

### Changed

- `Products` page migrated to TanStack Query for data loading, refresh, and invalidation.
- Product metadata loading (categories/suppliers/units) moved to dedicated query.
- Product create/update/delete flows now invalidate product query cache instead of manual fetch calls.
- Add Product flow prefetches metadata query for faster modal open.
- Offline sync runner now applies retry-aware scheduling with exponential backoff and retry caps.

### Fixed

- Duplicate offline queue records for same entity/type/id are coalesced.
- Failed sync attempts are now tracked without hammering backend endpoints.
- Barcode scanner cleanup now safely stops both primary and fallback engines on close/unmount.
