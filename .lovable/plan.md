
# Tuungane Services Upgrade — Reconcile, Don't Rebuild

This is a large request. To keep it safe and shippable, I'll do it in **4 phases**, each ending in a working app. Nothing existing gets removed — auth, profiles, timeline, opportunities, Official, notifications, reviews, recommendations, follows all stay.

## Reconciliation with what's already there

Most of what you described already exists. I will **extend**, not duplicate:

| You asked for | Existing — will extend | New — will add |
|---|---|---|
| `service_requests` | ✅ `service_requests` (has status, urgency, budget, location, completion fields) | add `title`, `visibility`, `selected_provider_id`, `completion_code`, `commission_eligible` |
| `service_reviews` (verified) | ✅ `service_feedback` (already verified, has quality/time/price flags) | add `quality_rating`, `timekeeping_rating`, `communication_rating`, `price_fairness_rating` numeric columns |
| `service_request_status_history` | ✅ already exists with trigger | none |
| `provider_trust_stats` | ❌ currently a TS interface only | create as a **view** computed from `service_requests` + `service_feedback` + `follows` (no duplicate state) |
| `notifications` | ✅ exists with helper fn | add new types only |
| `reports` | ✅ exists | reuse |
| `provider_responses` (quotes) | ❌ | **new table** |
| `service_request_photos` | ❌ — currently a single `attachment_url` | keep `attachment_url` for MVP, add table only if multi-photo requested |
| `service_jobs` | ❌ — currently the `service_request` itself IS the job (status flows through it) | **do not create**; keep the single-table flow. Add `selected_provider_id` + `completion_code` to `service_requests` instead. This is simpler and avoids data duplication. |

**Status vocabulary** — existing enum is `requested, accepted, in_progress, completed, cancelled, disputed`. I'll map your names onto it:
- Open = `requested`
- Provider Selected = `accepted` (set when customer picks a provider response)
- In Progress = `in_progress`
- Completed = `completed`
- Feedback Given = `completed` + a row in `service_feedback`
- Cancelled = `cancelled`
- Disputed = `disputed`

This keeps the existing trigger/notifications working and avoids a breaking enum migration.

## Phase 1 — Schema & matching foundations (1 migration)

1. **Extend `service_requests`**: `title text`, `visibility text default 'public' check in ('public','matching_only')`, `selected_provider_id uuid`, `completion_code text`, `provider_confirmed_completion bool default false`, `customer_confirmed_completion bool default false`.
2. **Extend `service_feedback`**: add `quality_rating int`, `timekeeping_rating int`, `communication_rating int`, `price_fairness_rating int` (1–5, nullable for back-compat).
3. **New `provider_responses` table** with RLS:
   - Columns: `id, request_id, provider_id, message, quote_amount numeric, availability_note, estimated_time, portfolio_post_id uuid null, status text ('sent','viewed','shortlisted','chosen','declined','withdrawn'), created_at, updated_at`.
   - RLS: provider inserts own; customer of the request + provider can read; provider updates own while request open; customer can update status to `chosen`/`declined`.
   - GRANTs to authenticated + service_role.
4. **`provider_trust_stats` as a VIEW** over existing tables — no new write path, always fresh.
5. **Trigger**: when a `provider_responses.status` becomes `chosen`, set parent `service_requests.status='accepted'`, `selected_provider_id=...`, generate 6-char `completion_code`, and notify other responders (`declined`).
6. **Matching helper**: SQL function `matching_requests_for_provider(uuid)` joining `service_requests` (status=requested, visibility public OR matching with category overlap) with `service_profiles` on `category_slug` + areas_served/town.

## Phase 2 — Provider responses & comparison UI

Frontend only, no schema changes.

1. **`ProviderResponseDialog`** — opened from Service Request Details by a matching provider. Quote, message, availability, ETA, optional portfolio link.
2. **`/requests/$id` route** — Service Request Details page with:
   - Status tracker (5-step visual: Open → Selected → In Progress → Completed → Feedback).
   - Customer view: list of `provider_responses` as comparison cards (avatar, name, rating, completed jobs, trust label, quote, message, View Profile / Choose / Decline / Message buttons).
   - Provider view: their own response (edit/withdraw) + Respond button if none.
   - Job tracking section (only when accepted+): Mark In Progress, Mark Completed with completion code, Confirm Completion, Cancel, Dispute.
   - Completion-code box: customer sees code; provider has input.
3. **`/services/requests` (Service Requests Feed)** — public open requests with filters (category, town, urgency, budget). Reuses `ServiceRequestCard` (extend with response-count badge + Respond CTA for matching providers).
4. **Update `RequestServiceDialog`**: add `title` field, `visibility` toggle, urgency labels (Today/This week/Flexible), budget bucket select.

## Phase 3 — Dashboards, matching feed, trust score, notifications

1. **Provider dashboard section: "Matching service requests"** — calls `matching_requests_for_provider` for current user.
2. **Customer dashboard: extend `MyRequestsSummary`** with response counts per request and quick "Compare responses" link.
3. **Trust score widget** on provider profile — computed client-side from the `provider_trust_stats` view; show numeric + label (New / Building Trust / Trusted / Highly Trusted).
4. **Verified Service Review form upgrade** — add the 4 sub-ratings to `FeedbackDialog`. Render them on provider profile reviews tab.
5. **Notification types added**: `request_response_new`, `request_response_chosen`, `request_response_declined`, `completion_code_used`, plus reuse existing `request_*` types.

## Phase 4 — Polish, empty states, nav

1. Empty states everywhere (no matching providers / no responses yet / new provider).
2. Mobile bottom nav already has Requests; add **Request** as a primary CTA (FAB) on Home + Services.
3. Update Header nav (already has Requests). Add **"Find skilled people"** as alias of `/services` (or new filtered view) if needed.
4. Final QA pass on all existing flows (auth, timeline, opportunities, official, admin).

## Explicitly OUT of scope (per your MVP rule)

- Payments, escrow, payouts, commissions, contracts.
- Real-time websocket notifications (uses existing in-app `notifications` table; you can add Realtime later).
- Complex AI matching — using simple category + location SQL join.
- Separate `service_jobs` table — request IS the job (avoids state-sync bugs).
- Multi-photo uploads — keeping single `attachment_url` for MVP.
- Business/Organization role — current `profiles.is_provider` covers MVP; full org role is a follow-up.

## Order of operations & approvals

I'll start with **Phase 1 migration** (one tool call, you approve), then build Phases 2–4 in code with parallel edits. After each phase I'll pause briefly so you can sanity-check.

**Shall I proceed with the Phase 1 migration?**
