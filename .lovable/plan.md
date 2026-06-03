ns# Focus Pass: Make Services the Core Loop

Goal: a first-time visitor understands in 5 seconds that Tuungane = "request a service, get matched with trusted providers." Everything else becomes secondary.

No features are deleted. No database changes. Pure navigation, home page, and copy restructuring.

## 1. Home page (`src/routes/index.tsx`)

Rebuild around one clear primary action.

- **Hero**: single, dominant CTA — "Request a service" (and secondary "Browse providers"). Replace any mixed hero that gives equal weight to feed/opportunities/official.
- **Section 1 — How it works (3 steps)**: Request → Get matched → Verified review. Visual, short.
- **Section 2 — Popular service categories**: grid of top categories linking into `/services`.
- **Section 3 — Featured providers / business pages**: trust-builder.
- **Section 4 — Recent verified reviews**: social proof from the core loop.
- **Section 5 (small, demoted)**: "Also on Tuungane" strip with 3 small cards: Opportunities, Community Feed, Official updates. One line each, no large imagery.

Logged-in users see the same structure but with a personalized "Your active requests" strip above categories if any exist.

## 2. Desktop header (`src/components/Header.tsx`)

Trim the top nav from 8 items to 4 primary + a "More" dropdown.

Primary nav (always visible):
- Home
- Services
- Businesses
- My Requests (logged in) / How it works (guest)

"More" dropdown:
- Service Feed (open requests for providers)
- Opportunities
- Community Feed
- Official

Primary CTA button (right side) changes from "Post a service" to **"Request a service"** for guests — matches the core loop verb. Keep "Post a service" inside the user dropdown for providers.

## 3. Mobile bottom nav (`src/components/MobileBottomNav.tsx`)

Already close to right. Adjust:
- Home | Services | **Request (FAB)** | My Requests | Me
- Replace "Feed" tab with "My Requests" (logged in) or "Browse" (guest). Feed moves to header "More" / profile menu.
- The center FAB already routes to `/services` — keep, but rename label to "Request" (it is) and ensure it leads to the request flow, not just the browse page. Confirm `/services` opens the request dialog or change FAB target to the request entry point.

## 4. RequestFab (`src/components/RequestFab.tsx`)

Show on more surfaces (currently only 4 routes). Add `/businesses`, `/opportunities`, `/feed` so the core action is never more than one click away.

## 5. User dropdown (`src/components/Header.tsx`)

Reorder to put core-loop items first:
1. My dashboard
2. My requests
3. Post a service (provider action)
4. My profile
5. Tuungane Credits
--- divider ---
6. Create business page
7. Post an opportunity
8. Activity feed
9. Admin (if moderator)
10. Sign out

## 6. Copy sharpening

- Tagline everywhere: **"Request a service. Get matched with trusted providers."**
- Footer keeps all links (no removals).
- Guest "Post a service" button → **"Request a service"** (CTA matches what 90% of visitors actually want).

## 7. What stays untouched

- All routes, all data, all RLS, all components.
- Opportunities, Feed, Official, Credits, Boosts — all still reachable, just demoted in IA.
- No edits to business logic, auth, or backend.

## Files to edit

- `src/routes/index.tsx` — home page rebuild
- `src/components/Header.tsx` — nav trim + More dropdown + CTA label + user menu reorder
- `src/components/MobileBottomNav.tsx` — tab swap
- `src/components/RequestFab.tsx` — broader visibility

## Reversibility

Every change is in 4 presentation files. Git revert restores the previous IA in one step.

## Out of scope (next phase)

- Database naming conflicts (`service_profiles` vs `profiles`)
- Service request end-to-end flow audit
- Empty states / mobile polish
- Route + dead-button audit
