
# Plan: Unify Opportunities + Service Requests into "Requests"

## Strategy

Single concept across the app: **Requests**. Customers post what they need; providers respond; one provider is selected; the request runs through to a verified review. The existing `service_requests` + `provider_responses` + `service_feedback` tables already model this 1:many → 1:1 lifecycle — we extend it to support truly open posts (no specific provider targeted) and retire the broad `opportunities` feature.

Brand line "Tuungane — Connect to Opportunity" stays. Only the product surface changes.

## Data Model (one migration)

1. `service_requests.provider_id` → **nullable**. Open requests have `provider_id = NULL` until a provider is selected (`selected_provider_id` set + status `accepted`). Existing `no_self_request` check tolerates NULL.
2. Add `service_requests.urgent_flag boolean default false` (drives "Urgent" filter chip; also keep existing `urgency` enum: emergency=Today, urgent=This Week, normal=Flexible).
3. Update `provider_responses` insert policy: drop the `r.provider_id <> auth.uid()` implicit reliance — allow any provider to respond when `r.status='requested'` and `r.customer_id <> auth.uid()`.
4. Update `handle_service_request_status` trigger: on INSERT, only fire `request_new` notification to `NEW.provider_id` when it's NOT NULL (open posts notify nobody on creation).
5. **Archive legacy data**: `UPDATE opportunities SET archived=true, status='rejected'`. Keep table + RLS as-is; just hidden from UI. (Data preserved per your answer.)

No table drops. `opportunities`, `opportunity_applications`, `saved_opportunities`, `opportunity_reports` remain in DB, removed from the UI in step 2.

## Route Changes

- **Keep** `/requests` (My Requests dashboard) and `/requests/$id` (Request Details).
- **New** `/requests/browse` → public open-requests board (replaces `/opportunities`). This is what the menu "Requests" links to.
- **New** `/requests/new` → Create a Request form (replaces `/opportunities/new` and the current targeted RequestServiceDialog flow). Targeted-provider variant remains available from a provider profile (pre-fills `provider_id`).
- **Redirects**: `/opportunities` → `/requests/browse`, `/opportunities/$id` → `/requests/$id` (component-level navigate on mount), `/opportunities/new` → `/requests/new`. Files become thin redirect shims so old links never 404.
- `services.requests.tsx` (current "matching requests" for providers) folds into `/requests/browse?for=me`.

## File-by-file Changes

**New**
- `src/routes/requests.browse.tsx` — open-requests board (hero, search, filters, list)
- `src/routes/requests.new.tsx` — Create a Request form
- `src/components/RequestCard.tsx` — replaces `OpportunityCard`
- `src/data/requestTypes.ts` — filter chips, category list, copy constants

**Rename/rewrite content (no behavior change beyond copy)**
- `src/components/Header.tsx` — nav: Home, Services, Requests, Businesses, Work Feed, Community Feed, Official; "More" menu trimmed. Primary CTA: "Create a Request" → `/requests/new`.
- `src/components/MobileBottomNav.tsx` — Home · Services · Create (FAB → `/requests/new`) · Requests (`/requests`) · Me/Sign in.
- `src/components/RequestFab.tsx` — link to `/requests/new`, label "Create a Request"; visible on home, services, requests, browse, businesses, feed, official.
- `src/routes/index.tsx` — replace "Also on Tuungane → Opportunities" tile with "Open Requests" → `/requests/browse`.
- `src/routes/requests.tsx` — page title "My Requests"; tab labels stay.
- `src/routes/requests.$id.tsx` — page title "Request Details"; section header "Provider Responses".
- `src/components/admin/OpportunitiesAdminTab.tsx` → archived; new `src/components/admin/RequestsBrowseAdminTab.tsx` shows open requests on the public board for moderation.
- `src/routes/admin.tsx` — replace Opportunities tab with "Manage Requests" (existing RequestsAdminTab handles tracked requests; new tab handles open-board moderation).
- `src/routes/feed.tsx`, `src/routes/dashboard.tsx`, `src/routes/credits.tsx`, `src/routes/businesses.*`, `src/routes/u.$id.tsx`, `src/routes/about.tsx`, `src/components/Footer.tsx`, `src/components/Logo.tsx`, `src/components/MobileActionBar.tsx`, `src/components/OfficialPostCard.tsx`, `src/components/admin/OverviewTab.tsx`, `src/components/admin/OfficialPostForm.tsx`, `src/components/social/PostComposer.tsx`, `src/components/business/BusinessPageManager.tsx`, `src/components/SafetyNote.tsx`, `src/hooks/use-boosts.ts`, `src/data/postTypes.ts`, `src/data/officialPostTypes.ts` — string sweep: replace "Opportunity/Opportunities" public-facing copy with "Request/Requests" per your wording table; drop gig/job/internship/volunteer/apprenticeship from filter options, type selectors, post-type pickers, boost-target labels. Keep brand tagline "Connect to Opportunity" intact.

**Redirect shims (replace existing file contents)**
- `src/routes/opportunities.tsx`, `src/routes/opportunities.$id.tsx`, `src/routes/opportunities.new.tsx` — render a `<Navigate>` to the new path so existing links and notifications resolve.

**Retire (UI only)**
- `src/components/OpportunityCard.tsx` deleted (only consumer is the old opportunities route).
- `src/data/opportunities.ts` deleted after import sweep.

## Open Requests Board (`/requests/browse`)

- Hero eyebrow "OPEN REQUESTS"; heading "Find Open Requests Near You"; supporting copy and CTAs per your spec.
- Search input ("Search requests…") and location input ("Location e.g. Entebbe, Kampala, Wakiso").
- Filter chips: All · Urgent · Today · This Week · Nearby · Verified · Open. Mapped to: `urgent_flag=true`, `urgency='emergency'`, `urgency='urgent'`, district-match (uses profile.district), customer has verified flag (via `service_profiles`/badge), `status='requested'`.
- Category select (placeholder "All categories") using your category list.
- Checkboxes: Urgent only · Verified customer only · Budget shown · Near me.
- Safety note copy replaced per your spec.
- Card content: title (or `service_needed`), category, location, urgency badge, budget range, short description, poster name + verified badge, time posted, response count, status badge, View Details / Respond / Save buttons.
- Query scope: `service_requests` where `visibility='public'` AND `status='requested'` AND `provider_id IS NULL` (true open posts) — plus optionally include targeted public ones if you want; default excludes those to keep the board clean.

## Create a Request (`/requests/new`)

Form fields per your spec: category, title, description, location (area/town/district), urgency (Today/This Week/Flexible → maps to existing enum), budget_range, preferred_date/time, photo (single attachment via existing `tuungane-media` bucket), contact preference, visibility. Inserts into `service_requests` with `provider_id=NULL` for open posts. Pre-filled `provider_id` path (from provider profile "Request this provider") sets `visibility='matching_only'` and targets that provider — same flow as today.

## Provider Response Flow

Existing `provider_responses` table reused unchanged. UI labels: "Respond", "Provider Responses". When customer marks a response `chosen`, existing trigger sets `service_requests.selected_provider_id`, sets `status='accepted'`, copies the chosen provider into `provider_id` (extend trigger to backfill `provider_id` from the chosen response when it was NULL). From there the existing 1-to-1 status flow (accepted → in_progress → completed → verified review) runs untouched.

## Notifications Copy

Updated message strings in the trigger functions (`handle_service_request_status`, `handle_provider_response`, `handle_service_feedback`) — already use "service request" / "feedback" wording; tweak to "request" / "verified review" per your spec.

## Dashboards & Admin

- Customer "My Requests" tab already exists at `/requests`. Add labels: Responses Received, Selected Provider, Request Status.
- Provider view at `/requests` already exists (role toggle). Add "Open Requests" link → `/requests/browse?for=me` (uses `matching_requests_for_provider` RPC).
- Admin: replace "Opportunities" tab with "Manage Requests" → reuses `RequestsAdminTab` + new browse moderation list. "Manage Provider Responses", "Manage Disputes", "Manage Verification", "Manage Reports" — existing tabs renamed.

## Out of Scope

- Database column renames (`opportunities` → `requests`) — not safe per your instruction; left for a later cleanup.
- Internal type names like `ServiceRequestRow` — kept for code stability; only UI copy changes.
- Messaging/chat — not in this pass.
- Saved requests UI on the browse page if `saved_opportunities` is the only saved store — added in a thin layer that writes to a small `saved_requests` table if needed, otherwise deferred (call out: I'll defer "Save" button wiring unless you want it included).

## Risks

- Making `provider_id` nullable touches multiple RLS policies that join on it (`provider_responses`, `contact_logs`, `contact_reveals`, `service_feedback`). None of those policies will be reached for open requests because the joins require `provider_id` to match; behavior is unchanged for existing 1:1 requests. Verified in the schema dump.
- The trigger backfill of `provider_id` on response selection is the critical correctness point; will include in the migration and add a SQL test path.

## Estimated Surface

~25 file edits, 2 new routes, 1 migration, 3 redirect shims, ~2 deletions. No teardown of working features.
