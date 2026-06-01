# Site Audit — Prioritized Issues & Fix Plan

The "This page didn't load" screen you see is the root `ErrorComponent` in `src/routes/__root.tsx`. It fires when a route loader or component throws. The audit found a mix of routes that crash, routes that silently show fake data, and queries that bypass the type system (so column typos go undetected). Below is the prioritized list followed by what I'll change.

## Prioritized issues

### Critical — wrong data or dead page
1. **`/services/$slug`** (`src/routes/services.$slug.tsx:42`) — only renders hardcoded sample providers (`p1`, `p2`) from `src/data/providers.ts`. Real `service_profiles` are never queried, so the category landing pages look broken/empty.
2. **`/providers/$id`** (`src/routes/providers.$id.tsx:7`) — sample-only route. Throws `notFound()` for every real UUID. Reviews, buttons, contact gating are all mocked. The real provider profile lives at `/u/$id`; this URL should redirect there.

### High — silent breakage / no error boundary
3. **`(supabase as any).from(...)` everywhere** (~30 call sites across `routes/requests.*`, `routes/services.requests.tsx`, `components/RequestServiceDialog.tsx`, `FeedbackDialog.tsx`, `MyRequestsSummary.tsx`, `admin/RequestsAdminTab.tsx`, `admin/OverviewTab.tsx`, etc.). The Supabase generated types are stale for `service_requests`, `provider_responses`, `service_feedback`, `service_disputes`, `contact_logs`, etc. `OverviewTab.tsx:29` even uses `as never`. Result: column-name typos cause silent runtime 400s that surface as the generic "page didn't load" screen.
4. **`/opportunities/$id`** (`src/routes/opportunities.$id.tsx:69`) — when the opportunity doesn't exist, the page shows "Loading or not found…" forever. No `notFound()` throw, no error component.

### Medium
5. **`/notifications`** (`src/routes/notifications.tsx:93-94`) — two near-duplicate `<p>` description paragraphs rendered back-to-back.
6. **Admin Overview → Pending Claims badge** (`src/components/admin/OverviewTab.tsx:42`) — jumps to the Official tab but lands on the "Account" sub-tab, not "Claim Requests".
7. **`MatchingRequestsSection`** (`src/components/MatchingRequestsSection.tsx:20`) — calls `rpc("matching_requests_for_provider", { _provider: user.id })` without guarding `user` first; fires with `undefined` during the auth-loading flash.
8. **Routes with loaders missing `errorComponent` / `notFoundComponent`** — most `src/routes/*.tsx` don't define either, so any thrown error bubbles to the root error page instead of a route-scoped fallback.

### Low
9. `contact_logs.service_job_id` is declared but never written (harmless — nullable).
10. `RecommendDialog` / `ReviewDialog` upserts rely on a specific unique-constraint name; if missing, duplicates can sneak in.
11. `/businesses/new` and `/opportunities/new` redirect unauthenticated users in `useEffect` (post-render), causing a brief form flash.

---

## Fix plan (in order, one PR-sized step each)

### Step 1 — Stop the silent-crash class of bug (High #3)
Regenerate `src/integrations/supabase/types.ts` so `service_requests`, `provider_responses`, `service_feedback`, `service_disputes`, `contact_logs`, `contact_reveals`, `provider_privacy_settings` are typed. Then remove every `(supabase as any)` and `as never` cast across:
- `src/routes/requests.tsx`, `src/routes/requests.$id.tsx`, `src/routes/services.requests.tsx`, `src/routes/u.$id.tsx`
- `src/components/RequestServiceDialog.tsx`, `FeedbackDialog.tsx`, `MyRequestsSummary.tsx`, `MatchingRequestsSection.tsx`, `ContactProviderModal.tsx`, `ContactedProvidersList.tsx`, `ProviderContactsList.tsx`, `StatusTracker.tsx`
- `src/components/admin/RequestsAdminTab.tsx`, `OverviewTab.tsx`, `DisputesAdminTab.tsx`, `ContactAnalyticsTab.tsx`

This alone will surface most "page didn't load" errors as typecheck failures we can fix once.

### Step 2 — Real provider/category pages (Critical #1, #2)
- **`/providers/$id`** — replace the sample lookup with a redirect to `/u/$id` (use `<Navigate>` / `redirect()` in `beforeLoad`). Delete the mock review/section code. Keep the route alive only as a redirect shim so old links don't 404.
- **`/services/$slug`** — replace `providersByCategory(...)` with a Supabase query: `service_profiles` filtered by `category_slug`, joined with `profiles` for `full_name`/`avatar_url`, ordered by `trust_score` or `updated_at`. Render through the existing `ProviderCard` component. Keep `categories` data for the hero/copy.

### Step 3 — Defensive route boundaries (High #4, Med #8)
- Add `notFoundComponent` + `errorComponent` to every route with a loader or dynamic param: `/u/$id`, `/providers/$id`, `/opportunities/$id`, `/official-posts/$id`, `/businesses/$slug`, `/requests/$id`, `/services/$slug`. Each renders a small in-page "Couldn't load this page" card with Retry + Go home, instead of bubbling to the root error.
- In `/opportunities/$id`, when `maybeSingle()` returns `null` throw `notFound()` so the new boundary takes over.

### Step 4 — Small bug cleanup (Med #5, #6, #7)
- Delete the duplicate `<p>` in `notifications.tsx`.
- `OverviewTab.tsx` Pending Claims handler: switch the admin tab to `official` AND pass through a sub-tab hint (extend `onJump` to accept `{ tab, subTab }`) so `OfficialTabContent` opens on "Claim Requests".
- Guard the RPC call in `MatchingRequestsSection` with `if (!user) return;` and skip the effect until auth is resolved.

### Step 5 — Polish (Low)
- Move the auth check in `/businesses/new` and `/opportunities/new` from `useEffect` to `beforeLoad` with `throw redirect({ to: "/login" })`.
- Write `contact_logs.service_job_id` when a logged contact happens on a request that already has a `service_jobs` row.
- Verify the unique constraint names for `provider_recommendations` and `reviews`; if missing, add them in a small migration.

## Out of scope
- No backend/data-model changes beyond the small constraint check in Step 5.
- No redesign — visual changes are limited to the new in-page error/notFound cards.
- I will not migrate `/providers/$id` to a fully duplicated profile page — redirecting to `/u/$id` keeps one source of truth.

## How I'll verify
After each step, navigate the affected routes in the preview (signed-in customer + signed-in provider), watch the browser console + network panel for 400/401 responses, and confirm the "This page didn't load" screen no longer appears on the audited routes.
