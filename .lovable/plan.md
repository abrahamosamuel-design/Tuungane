## Goal
Make "My Service Requests" highly visible. Currently it only lives in the avatar dropdown and at `/requests` directly — the user can't find it.

## Changes

### 1. Header top-level nav (`src/components/Header.tsx`)
- Add `{ to: "/requests", label: "Requests" }` to the main `nav` array (visible to everyone in the desktop nav and mobile drawer).
- Keep the existing "My requests" entry in the avatar dropdown.

### 2. Mobile bottom nav (`src/components/MobileBottomNav.tsx`)
- Replace the "Services" tab slot or add a "Requests" tab using the `ClipboardList` icon so authenticated users can reach `/requests` in one tap.
- Only show when `user` is logged in (otherwise keep current Services tab).

### 3. Dashboard section (`src/routes/dashboard.tsx`)
- Add a prominent "My service requests" card near the top of the dashboard.
- Fetch the latest 5 `service_requests` for the current user (both as customer and as provider, deduped, ordered by `created_at desc`).
- For each: show counterparty name/avatar, service needed, status badge (using `requestStatusMap`), and timestamp.
- Show summary counts (Active / Completed / Disputed).
- "View all" button → `/requests`.
- Empty state: "No service requests yet — browse Services to request one."

### 4. Profile page (`src/routes/me.tsx`)
- Add a "My service requests" section with the same summary card (latest 3 + counts + link to `/requests`).

### 5. Visibility & polish
- Ensure the `/requests` route loads correctly for logged-in users (already exists — verify auth redirect works).
- Add a small orange dot badge on the Header "Requests" link when there are active requests in `requested`, `accepted`, or `in_progress` status (lightweight count query on header mount).

## Out of scope
- No database changes (schema already in place).
- No changes to request creation, feedback, or admin flows.
- No design system token changes.

## Files touched
- `src/components/Header.tsx`
- `src/components/MobileBottomNav.tsx`
- `src/routes/dashboard.tsx`
- `src/routes/me.tsx`
