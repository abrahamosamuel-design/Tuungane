# Service Requests & Verified Feedback

Build an end-to-end request → status → completion → feedback → verified review loop on top of the existing Tuungane MVP, without payments/scheduling/escrow.

## Database (new migration)

New tables (all with GRANTs + RLS):

1. `service_requests` — full field set from spec (customer_id, provider_id, category, subcategory, service_needed, location/district/town/area, description, preferred_date/time, urgency, budget_range, preferred_contact_method, phone, whatsapp, attachment_url, status, timestamps).
2. `service_request_status_history` — audit log (old_status, new_status, changed_by, note).
3. `service_feedback` — verified-review fields (rating, would_recommend, was_on_time, work_quality_good, price_fair, would_use_again, issue_reported, is_verified_review, is_visible).
4. `service_disputes` — raised_by, against, reason, description, status, admin_notes.

Enums: `service_request_status` (requested/accepted/in_progress/completed/cancelled/disputed), `service_urgency` (normal/urgent/emergency), `contact_method` (phone/whatsapp/in_app/any), `dispute_status` (open/reviewing/resolved/dismissed).

Triggers/functions:
- Trigger on `service_requests` UPDATE → insert into status_history when status changes.
- Trigger on `service_requests` status→completed → create notification for customer asking for feedback.
- Trigger on `service_requests` INSERT → notify provider.
- Trigger on `service_requests` status changes → notify the other party.
- Trigger on `service_feedback` INSERT → notify provider, set `is_verified_review=true` when linked to a completed request.

`provider_trust_stats` modeled as a **VIEW** (simpler than a denormalized table for MVP) aggregating from `service_requests`, `service_feedback`, `provider_recommendations`, `follows`. Public SELECT.

RLS:
- `service_requests`: customer or provider can read own rows; insert by customer (self); update by customer or provider party; admins/mods full.
- `service_feedback`: customer (author) insert/update within 7 days; everyone can read where `is_visible=true`; admins/mods can update visibility.
- `service_disputes`: raised_by or against can read; insert by either party; admin/mod can update.
- Anti-self-review: CHECK / WITH CHECK that customer_id ≠ provider_id on requests and feedback.

## UI

**RequestServiceDialog** (new) — form per spec, opens from:
- `ProviderCard` (services list)
- `/u/$id` (provider profile)
- `/providers/$id` sample profile (already redirects to feed)
- Provider's timeline `PostCard` (new "Request" affordance)

**FeedbackDialog** (new) — opens from "My Requests" when status=completed and no feedback yet, or from a notification CTA.

**New routes**:
- `/requests` (auth-only) — tabs: "As customer" / "As provider", filterable by status, with action buttons (Accept / In progress / Complete / Cancel / Dispute / Leave feedback / Report).
- Admin tab "Requests & Feedback" added to `/admin` — list/filter all requests, view feedback, hide reviews, resolve disputes, stats summary.

**Profile / discovery integration**:
- `/u/$id` shows a Trust Stats strip (avg rating, total verified reviews, completed services, recommendations, followers) and a "Verified Service Reviews" section.
- `ProviderCard` gets a primary "Request service" CTA alongside existing contact.
- `VerifiedReviewBadge` component + review card layout.

**Notifications**: reuse existing `notifications` table; new `type` values: `request_new`, `request_accepted`, `request_in_progress`, `request_completed`, `request_cancelled`, `feedback_request`, `feedback_received`, `dispute_opened`. Wired via DB triggers calling `public.create_notification`.

**Safety/help text** on request form and feedback form per spec.

## Files

New:
- `supabase/migrations/<ts>_service_requests.sql`
- `src/data/serviceRequestTypes.ts` (enums, labels, status colors)
- `src/components/RequestServiceDialog.tsx`
- `src/components/FeedbackDialog.tsx`
- `src/components/VerifiedReviewBadge.tsx`
- `src/components/TrustStats.tsx`
- `src/components/ServiceRequestCard.tsx`
- `src/routes/requests.tsx`
- `src/components/admin/RequestsAdminTab.tsx`

Edited:
- `src/components/ProviderCard.tsx` (Request CTA)
- `src/routes/u.$id.tsx` (TrustStats + Verified Reviews + Request CTA)
- `src/routes/services.tsx` (Request CTA on real provider cards)
- `src/components/Header.tsx` & `MobileBottomNav.tsx` (link to `/requests`)
- `src/routes/admin.tsx` (add "Requests" tab → RequestsAdminTab)
- `src/routes/me.tsx` or `dashboard.tsx` (link to /requests)

## Out of scope (per MVP rule)
Payments, escrow, contracts, scheduling, delivery tracking, automatic penalties.

## Order of work
1. Migration (tables, enums, triggers, view, RLS, GRANTs).
2. Types file + shared components (Dialog, Badge, TrustStats, ServiceRequestCard).
3. `/requests` route with both tabs.
4. Integrate Request CTA into ProviderCard, `/u/$id`, services.
5. Admin "Requests & Feedback" tab.
6. Header/mobile-nav link + notification labels.
