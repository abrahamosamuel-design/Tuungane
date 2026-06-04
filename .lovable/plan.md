# Plan: End-to-end audit of Tuungane

Goal: verify every page, button, and user flow works as expected in the current preview, then deliver a single findings report with severity-ranked issues and recommended fixes. No code changes in this pass — fixes happen in a follow-up after you approve the findings.

## Scope

All public + authenticated surfaces currently in the app:

1. **Public marketing / discovery**
   - `/` Home (hero, "Create a Request" CTA, Open Requests tile, popular services, recommended providers, categories)
   - `/services` + `/services/$slug`
   - `/requests/browse` (filters, chips, category select, checkboxes, search, location, cards)
   - `/businesses` + `/businesses/$slug`
   - `/official` + `/official-posts/$id`
   - `/feed`
   - `/about`, `/contact`, `/terms`

2. **Auth**
   - `/login` (email + Google), sign-out from header menu, session persistence after refresh

3. **Customer flows**
   - `/requests/new` — create open request (provider_id null), create targeted request from provider page
   - `/requests` — My Requests tabs (as customer)
   - `/requests/$id` — request details, provider responses list, mark response as "chosen" → verify trigger sets `provider_id`, `selected_provider_id`, status=`accepted`
   - Status transitions: accepted → in_progress → completed → verified review (FeedbackDialog)
   - Contact reveal / credits gating on a provider

4. **Provider flows**
   - `/services/requests` and `/requests/browse?for=me` — matching requests
   - Respond to an open request via ProviderResponseDialog
   - `/requests` (provider view) — incoming requests, status updates

5. **Business owner flow**
   - `/businesses/create`, `/businesses/new`, BusinessPageManager edits, claim profile dialog

6. **Admin (only if your account has the role)**
   - `/admin` tabs: Overview, Manage Requests, Provider Responses (if present), Disputes, Verification, Businesses, Reports, Credits, Contact Analytics, Official posts

7. **Navigation chrome**
   - Header (desktop): primary nav, "More" menu, user menu items, NotificationsBell, CreditBalanceChip
   - MobileBottomNav: Home / Services / Create FAB / Requests / Profile, active states
   - RequestFab visibility rules
   - Footer links
   - Redirects: `/opportunities`, `/opportunities/$id`, `/opportunities/new` → new `/requests/*` paths

8. **Known signals to investigate first**
   - Console warning: duplicate React key `p2` (appears twice in current logs) — locate the list rendering and confirm root cause
   - Verify no leftover "Opportunity / Gig / Internship / Volunteer / Apprenticeship" copy in user-facing UI
   - Verify the migration that made `service_requests.provider_id` nullable + the trigger backfill behaves correctly when a customer picks a response on an open request

## Method

1. Use the in-sandbox browser tool at both mobile (390x844) and desktop (1366x768) viewports.
2. For each page: screenshot → click every visible interactive element → observe console + network → note any 4xx/5xx, blank states, broken links, dead buttons, broken active styles, wrong copy, layout breakage.
3. For destructive or irreversible actions (delete request, dispute, admin moderation actions), do NOT execute — just verify the UI opens and validation behaves; note them as "skipped, manual verification needed".
4. For DB-trigger correctness on the response-chosen flow, run a read-only query against `service_requests` + `provider_responses` after the test interaction to confirm `provider_id` was backfilled and status moved to `accepted`.
5. Track issues in the task tracker grouped by surface, with severity: **blocker / major / minor / polish**.

## Deliverable

A single report message containing:
- Per-surface pass/fail table
- Full list of issues with severity, reproduction steps, and suggested fix
- A short prioritized fix list you can approve to implement next

## Questions before I start

1. **Which test account(s) should I use?** I need at least one signed-in customer account and ideally one provider account to exercise both sides of the request flow. Should I use the account already logged into your preview, or do you have specific test credentials?
2. **Is it OK to create test data** (a couple of throwaway requests + provider responses) in the live preview DB? I will clean them up after, but they will briefly appear on the public Requests board.
3. **Do you want admin surfaces audited?** If yes and your current preview account doesn't have the `admin`/`moderator` role, say so and I'll skip those tabs.

## Out of scope for this audit

- Visual redesign suggestions beyond bugs/polish
- Performance profiling
- Penetration testing of RLS policies (separate task)
- Code refactors — this pass is observation only; fixes land in a follow-up after you approve the findings.
