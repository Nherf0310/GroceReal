# Phase 4 Progress (Driver Dashboard)

## Summary
- **Steps Done:**
  - Step 1: Currency & shared pieces (`formatMoney`, `convert`, `CurrencyProvider`, `CurrencyToggle`, `usePolling`, `StatusBadge`, local TypeScript API types).
  - Step 2: Available deliveries (`/driver`) with card listing, accept action, 409 conflict handling, active delivery guard, today's stats strip, 10s polling, skeletons, empty and error states.
  - Step 3: Active delivery (`/driver/active`) with two-step pickup/delivery flow, customer tap-to-call, cash-to-collect base + approx PHP display, delivered confirmation modal, failure modal with required reasons, result screen, polling lifecycle.
  - Step 4: Delivery history (`/driver/history`) with summary row (completed, failed, cash collected), cards with date, store, drop-off, status badge, failure reasons, and amount.
  - Step 5: Driver profile (`/driver/profile`) with GET/PATCH `/users/me`, validation for name and phone, read-only email/role, and alert banners.
  - Step 6: Code cleanup; verified zero raw `$` money formatting and zero demo/placeholder data in `apps/web/app/driver`.
- **Steps Skipped:** None
- **Steps Blocked:** None
- **API Gaps:** None blocking. The existing NestJS driver controller/service and users controller covered all necessary endpoints (`/driver/deliveries/available`, `/driver/deliveries/active`, `/driver/deliveries/history`, `/driver/deliveries/:id/accept`, `/driver/deliveries/:id/status`, `/users/me`).
- **Migration Note:** `app/customer` still uses its own money formatting and must be migrated to `formatMoney` in Phase 5.

---

## Manual Test Instructions
1. **Login:** Log in as a driver user at `/login` (redirects to `/driver`).
2. **Currency Toggle:** Toggle between `USD $` and `PHP ₱` in the dashboard header; verify amounts update reactively.
3. **Available Deliveries (`/driver`):** Check today's stats strip (completed deliveries and cash collected). Verify available delivery cards display store location, drop-off, items count, and delivery slot. Click "Refresh" or observe 10s auto-polling.
4. **Accept Delivery:** Click "Accept Delivery" on an available card. If another driver took it, verify 409 error message appears and list refreshes. On success, page redirects to `/driver/active`.
5. **Active Delivery - Step 1 (`/driver/active`):** Review store pickup location and phone. Click "Confirm Picked Up" to transition order to `OUT_FOR_DELIVERY`.
6. **Active Delivery - Step 2 (`/driver/active`):** Review customer details, tap-to-call link, drop-off address with notes, items checklist, and "Cash to collect" (displays exact USD, plus approximate PHP in brackets when PHP is selected).
7. **Complete / Fail Order:**
   - Click "Mark Delivered" -> verify confirmation prompt -> submit to mark `DELIVERED` and verify result screen.
   - Or click "Delivery Failed" -> choose reason (`CUSTOMER_UNAVAILABLE`, `WRONG_ADDRESS`, `OTHER`) and optional note -> submit to mark `DELIVERY_FAILED`.
8. **Delivery History (`/driver/history`):** Verify the completed or failed order appears with proper status badge, date, store, drop-off, amount, and failure note (if applicable). Check the updated summary counts on top.
9. **Driver Profile (`/driver/profile`):** Edit full name and phone number. Test validation error states, then submit valid changes and observe the success notification.

---

## Step Log
- Step 1 (currency and shared pieces): DONE (currency helpers, CurrencyProvider, CurrencyToggle, usePolling, StatusBadge, local API types) - 2026-11-05T15:01:00+08:00
- Step 2 (available deliveries /driver): DONE (cards, accept delivery with 409 handling, active delivery guard, today stats strip, 10s polling, loading/empty/error states) - 2026-11-05T15:12:10+08:00
- Step 3 (active delivery /driver/active): DONE (two-step flow: confirm pickup & customer delivery, cash to collect with approx PHP, delivered confirmation, failure modal with required reasons, post-delivery result screen, polling controls) - 2026-11-05T15:17:00+08:00
- Step 4 (history /driver/history): DONE (summary row with completed/failed/cash collected, delivery list with date/store/drop-off/failure reasons/amount, polling, skeleton/empty/error states) - 2026-11-05T15:19:30+08:00
- Step 5 (profile /driver/profile): DONE (GET and PATCH /users/me, name and phone validation, success and error alerts, read-only email/role, loading skeleton and retry) - 2026-11-05T15:21:20+08:00
- Step 6 (cleanup & verification): DONE (grep confirmed zero raw $ money formatting, clean web build & lint pass) - 2026-11-05T15:22:50+08:00
