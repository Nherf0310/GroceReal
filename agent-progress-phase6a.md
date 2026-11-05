# Phase 6A Progress

## Summary

**Steps Done:** 1 (Shared types & components), 2 (Overview), 3 (Orders list), 4 (Order workbench), 5 (Cleanup)
**Steps Skipped:** None
**Steps Blocked:** None
**API Gaps Found:** None — all endpoints used match the documented controller exactly
**Commit:** `1d4d74a` — "phase6a: steps 1-5 store overview orders list workbench shared types components"

### Manual Tests the User Should Run

1. **Login as STORE_MANAGER** at `/login` and navigate to `/store`
   - Verify stat cards show real data (new orders, revenue, low-stock, open slots)
   - Verify "Needs Attention" lists oldest PENDING orders and low-stock items
   - Verify cards refresh every 10 seconds (or use the ↻ button)

2. **Navigate to `/store/orders`**
   - Verify filter tabs (New, Confirmed, Picking, Ready, Out for Delivery, Completed, Closed) with counts
   - Verify order rows show reference, customer, items, total (in selected currency), slot, status badge, time ago
   - Verify search by order ID or customer name works
   - Verify ↻ button and 10-second polling

3. **Click a PENDING order** → navigated to `/store/orders/[id]`
   - Verify header shows reference, status badge, customer name, tap-to-call phone, address, slot, payment, notes, substitution preference
   - Click **Confirm Order** → confirm modal → order status changes to CONFIRMED
   - Click **Reject Order** → reason modal (required text) → order status changes to REJECTED with reason shown

4. **Click a CONFIRMED order** → click **Start Picking** → verify status changes to PICKING and picking checklist appears

5. **On a PICKING order**
   - Adjust fulfilled quantity on a line item → click **Save** → verify server saves it and total updates
   - After all items saved, click **Mark Ready for Driver** → verify status changes to READY_FOR_DELIVERY

6. **Currency toggle** (USD/PHP in header) — verify all money on overview/orders/order detail updates

## Classification Table

| Step | Status | Evidence |
|------|--------|----------|
| Step 1: Shared pieces | DONE | apps/web/app/store/types.ts, components/action-confirm-modal.tsx, components/reason-modal.tsx, lib/time-ago.ts |
| Step 2: Overview (/store) | DONE | apps/web/app/store/page.tsx — polling, stat cards, needs-attention panels |
| Step 3: Orders list (/store/orders) | DONE | apps/web/app/store/orders/page.tsx — tabs, search, polling |
| Step 4: Order workbench (/store/orders/[id]) | DONE | apps/web/app/store/orders/[id]/page.tsx — full workbench with picking checklist, modals |
| Step 5: Cleanup | DONE | No hardcoded "$" or demo data found in app/store |

## Progress Log

| Step | Result | Time |
|------|--------|------|
| Initial build check | PASS (EPERM retry) | 2026-11-05T11:58 |
| Classification | Done | 2026-11-05T11:58 |
| Step 1: Shared types & components | DONE | 2026-11-05T12:00 |
| Step 2: Overview page | DONE | 2026-11-05T12:00 |
| Step 3: Orders list page | DONE | 2026-11-05T12:01 |
| Step 4: Order workbench page | DONE | 2026-11-05T12:02 |
| Step 5: Cleanup grep | DONE | 2026-11-05T12:04 |
| TypeScript check | PASS (0 errors) | 2026-11-05T12:03 |
| Lint check | PASS (0 errors, 1 pre-existing warning in api.ts) | 2026-11-05T12:04 |
| Final build | PASS (EPERM retry needed, transient OneDrive issue) | 2026-11-05T12:04 |
| git commit | DONE (1d4d74a) — required BypassSandbox due to .git/index permissions | 2026-11-05T12:06 |
