# Phase 0 Changelog

Branch: `feature/phase-0`  
Date: 2026-02-04  

## Summary

14 commits addressing 4 P0 bugs, 5 P1 UX improvements, and 5 P2 code quality fixes.  
Dashboard page reduced from 684 → 247 lines. All files now under 300-line limit.

---

## P0 — Critical Bugs Fixed

### Supabase repo missing `max_loss_threshold` in strategy CRUD
- `SupabaseRepo.createStrategy()` and `updateStrategy()` silently dropped the `max_loss_threshold` field
- Authenticated users could set the threshold in the strategy form, but it was never persisted
- `LocalStorageRepo` already handled it correctly — only the Supabase implementation was broken

### Migration drops trade data on signup/login
- `migrateLocalToSupabase()` was missing fields: `stop_loss_price`, `max_loss`, `autopsy` (trades) and `max_loss_threshold` (strategies)
- Users migrating from anonymous to authenticated would permanently lose this data

### CSV import broken for Excel files
- Excel exports CSV with UTF-8 BOM (`\uFEFF`) prefix
- This caused the first header column to be unrecognized, silently breaking all imports from Excel

### React key warning in mobile trades table
- Mobile TradesTable used bare `<>` fragments in `.map()` without keys
- Fixed by using `<Fragment key={t.id}>` for proper React reconciliation

---

## P1 — UX Improvements

### Escape key closes modals
- Created `useEscapeKey` hook for reusable keyboard dismiss
- Dashboard modals close on Escape with priority order: autopsy → detail → trade → strategy
- Trade detail slide-out also closes on Escape

### Click-to-dismiss modal backdrops
- Strategy and trade modal overlays now close when clicking the dark backdrop
- Inner modal content stops propagation to prevent accidental dismissal

### Signup page reads referral code from URL
- Referral links generate `/signup?ref=CODE` but the signup page never read the param
- Now uses `useSearchParams()` to pre-fill the referral code field (with Suspense boundary)

### Breakeven option added to trade filter
- Data model supports `Breakeven` outcome but the filter dropdown was missing it
- Users can now filter for breakeven trades specifically

### Login/signup pages restyled to match Bloomberg terminal theme
- Replaced generic blue/rounded style with terminal aesthetic (mono font, orange accent, sharp corners)
- Added "continue without account" link on login page
- Error messages styled as terminal warnings

---

## P2 — Code Quality

### Dashboard page split from 684 to 247 lines
- Extracted `TradesTable` → `src/components/trades-table.tsx` (138 lines)
- Extracted `PerformancePanel` + `Stat` → `src/components/performance-panel.tsx` (92 lines)
- Extracted `StrategiesPanel` → `src/components/strategies-panel.tsx` (93 lines)
- Added `Suspense` boundary for `useSearchParams()` usage
- Moved all imports to top of file (were scattered at bottom)

### Trade form refactored under 200-line component limit
- `TradeForm` reduced from 230 → 155 lines
- Extracted `JournalFields`, `ComplianceChecklist`, `RiskBadge` sub-components
- `INPUT_CLASS` moved to module-level constant

### Shared utilities extracted
- `pnlColor()`, `outcomeColor()`, `formatDuration()` added to `src/lib/utils.ts`
- Removed duplicate `formatDuration()` from `trade-detail.tsx` and `open-positions.tsx`

### Sidebar hover handled via CSS
- Replaced fragile `onMouseEnter`/`onMouseLeave` inline style handlers with Tailwind `hover:` class

### CSV export/import improved
- Export now includes `stop_loss` column
- Import recognizes `stop_loss`, `stop_loss_price`, `stop`, `sl` as column aliases
- Data round-trips correctly without losing stop loss prices

### Error handling for data loading
- Dashboard `loadData()` wrapped in try/catch with error state
- Error shown as red terminal-style banner below status bar

---

## File Size Report (all under 300-line limit)

| File | Lines | Status |
|------|-------|--------|
| `dashboard/page.tsx` | 271 | ✓ (was 684) |
| `stats/page.tsx` | 250 | ✓ |
| `trade-form.tsx` | 249 | ✓ |
| `local-storage-repo.ts` | 210 | ✓ |
| All other files | < 200 | ✓ |
