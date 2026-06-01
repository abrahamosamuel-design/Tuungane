## Phase 4 — Polish & QA

Phases 1–3 shipped the schema, the job lifecycle (`/requests/$id`), the public service feed (`/services/requests`), provider responses, trust stats on profiles, sub-rating feedback, and the Request FAB. Phase 4 closes the loop: surface the new notification types, make every empty state actionable, finish mobile navigation, and QA the full happy path end-to-end.

### 1. Notifications surfacing
The migration trigger already inserts notifications with new types (`request_response_new`, `request_response_chosen`, `request_in_progress`, `request_completed`, `feedback_received`, `dispute_opened`, etc.). Wire them into the UI:
- Update `NotificationsBell.tsx` + `src/routes/notifications.tsx` to recognize the new `type` values: icon, color, and a deep link to `/requests/$id` for any `target_type = 'service_request'` and to `/u/$id` for `feedback_received` / `review`.
- Add a small "Job updates" filter chip on `/notifications` to triage request-related items.

### 2. Empty states (actionable)
- `MyRequestsSummary` (logged-in, zero requests): keep the "Browse services" CTA, add a secondary "Post a public request" link to `/services/requests`.
- `/requests` (zero requests): empty card with two CTAs — Browse services / View service feed.
- `MatchingRequestsSection` (provider has no matches): show "No matching requests right now. Update your category or service areas to reach more customers." + link to edit `/me`.
- `/services/requests` (feed empty after filters): "No open requests in {category}/{town}. Try clearing filters."
- Provider profile with zero `provider_trust_stats`: `TrustStats` already returns null — add a one-line "New on Tuungane" hint under the header so the profile doesn't look bare.

### 3. Mobile nav reconcile
- `MobileBottomNav.tsx` currently shows Feed/Requests conditionally. Confirm the 5-tab layout is: Home · Services · Requests (auth) / Feed (guest) · Notifications · Me.
- Ensure the FAB (`bottom-24`) sits above the bottom nav on mobile and doesn't overlap the Notifications tab — adjust `right-4` on small screens if needed.
- Add a "Service feed" entry to the desktop Header dropdown alongside "Requests".

### 4. Provider response polish
- On `/requests/$id`, when the current user is a matching provider with no response yet, show an inline "Send a response" CTA that opens `ProviderResponseDialog` (today it's only reachable from `MatchingRequestsSection` / `/services/requests`).
- Show the provider's own previous response status (sent / viewed / chosen / declined) on the same page so they don't re-submit.

### 5. Completion-code UX
- On `/requests/$id`, when `status = in_progress`:
  - Customer view: prominently display the 6-char `completion_code` with a "Copy" button and the instruction "Share this code with the provider only when the job is done."
  - Provider view: code input + "Mark complete" button (already there) — add inline error styling on mismatch instead of just a toast.

### 6. QA pass (manual checklist, no code changes unless bugs found)
Walk the happy path with two test accounts:
1. Customer posts a public request from the FAB → appears in `/services/requests`.
2. Provider sees it in `MatchingRequestsSection`, sends a response with quote.
3. Customer sees response on `/requests/$id`, chooses it → status flips to `accepted`, competing responses auto-decline, completion code generated, both parties notified.
4. Provider marks `in_progress`, then enters completion code → `completed`.
5. Customer leaves verified review with 4 sub-ratings → appears on provider profile, `provider_trust_stats` view updates rating/completed counts.
6. Confirm existing Tuungane flows still work: timeline post + like/comment, opportunity create/apply, Tuungane Official posts, profile claim, recommendations, follows.

### Technical notes
- All notification work is read-side: no schema changes, just UI mapping.
- Bottom-nav tweak is CSS-only; no route changes.
- Inline "Send a response" CTA on `/requests/$id` reuses the existing `ProviderResponseDialog` — no new component.
- Out of scope (unchanged from earlier): payments, websockets, advanced matching, multi-photo uploads.

Ready to switch to build mode and ship this?
