# Plan: "Request Service first. WhatsApp and Call second."

This is a substantial change touching UI, data model, and access rules. I'll keep it focused on the *contact gating* principle and reuse existing tables (`service_requests`, `provider_responses`, `service_feedback`, `admin_settings`) wherever possible — no rebuild.

---

## 1. Database (single migration)

**New tables**

- `contact_logs` — `id, customer_id, provider_id, service_request_id, service_job_id (nullable), contact_method ('whatsapp'|'call'|'in_app'), clicked_at, user_agent, created_at`. RLS: insert own (customer_id = auth.uid()); read own or provider or admin.
- `contact_reveals` — `id, customer_id, provider_id, service_request_id, revealed_phone, revealed_whatsapp, reveal_reason, created_at`. Same RLS shape.
- `provider_privacy_settings` — `user_id PK, contact_reveal_policy text default 'after_request' ('after_request'|'after_accept'|'after_selected'|'in_app_first'), updated_at`. RLS: read all, update own or admin.

**Admin settings seed** — insert into `admin_settings` row `setting_key='contact_visibility'` with JSON defaults (all 6 toggles = true as specified).

**Helper RPC** `can_reveal_contact(_customer uuid, _provider uuid)` returns boolean — true iff a `service_requests` row exists with this customer+provider in status ∈ (requested, accepted, in_progress, completed) AND respects provider privacy policy. SECURITY DEFINER, grant to authenticated.

GRANTs included for every new table; service_role full.

## 2. UI Changes

**ProviderCard** (sample data + real): primary CTA becomes "Request Service" (navy). Remove inline WhatsApp/Call buttons. Keep View Profile, Save, Share.

**`src/routes/providers.$id.tsx`** (sample) and **`src/routes/u.$id.tsx`** (real provider profile): 
- Primary action row: Request Service, Follow, Save, Share.
- Replace direct WhatsApp/Call/Email/phone display with a locked-state info card: *"Request this service through Tuungane to unlock contact options and help us track service quality."* + Request Service button.
- After request exists (query `service_requests` for customer↔provider), unlock WhatsApp / Call / Message buttons. Clicking logs to `contact_logs` via a small server fn / supabase insert.

**ContactProviderModal** (new component): used wherever a "Contact Provider" entry-point exists. Shows the gating message + Request Service / Cancel. Never reveals phone/WhatsApp.

**`src/routes/requests.$id.tsx`** (request detail / job tracking):
- Show unlocked contact options: WhatsApp Provider, Call Provider, Message on Tuungane, Track Request, Cancel Request, Report Issue.
- Customer safety note + provider safety note (for provider view).
- "Your request is now tracked by Tuungane…" banner.
- Log every WhatsApp/Call click into `contact_logs`.

**`ProviderResponseDialog` / open-request response cards**: before selection show View Profile / Message / Choose Provider / Decline only. After `provider_responses.status='chosen'` (selected provider), unlock WhatsApp/Call for that one provider.

**Post-submit step in `RequestServiceDialog`**: after successful insert, show success screen with "Would you like to contact the provider now?" → WhatsApp / Call / Message / Not now (only if request is tied to a specific provider).

**Verified Review gating**: in `FeedbackDialog` entry-points, gate the "Verified Service Review" CTA behind existence of a completed `service_requests` row for that customer↔provider. (Already mostly enforced by `sf_insert_customer` policy — add a UI guard so the button doesn't appear otherwise.)

## 3. Dashboards (light additions)

- **Customer dashboard** (`src/routes/dashboard.tsx`): add "Contacted providers" list pulled from `contact_logs` joined with provider profile.
- **Provider dashboard** (existing matching-requests / requests section): show contact method used per customer from `contact_logs`.
- **Admin dashboard** (`src/routes/admin.tsx`): new "Contact analytics" tab — totals for whatsapp/call/in_app clicks, requests created, requests→contact conversion, requests completed, suspicious patterns (providers with many clicks but few completions).

## 4. Admin contact-visibility settings UI

New panel in admin (under Settings) bound to `admin_settings.contact_visibility` row with the 6 toggles listed in the spec. Defaults true.

## 5. Out of scope for this iteration

- Provider privacy settings UI (table created with default; UI to edit can land next).
- Deep refactor of every place a phone link exists (will target the major surfaces listed above; smaller mentions handled best-effort).
- New SMS / call-deflection logic.

---

## Technical notes

- Privacy gating is enforced both in UI (hide buttons) and via the `can_reveal_contact` RPC for any future server-side reveal. Direct phone columns on `service_profiles` remain selectable (changing that requires a column move which is out of MVP scope), but the UI never renders them pre-request.
- Contact log inserts use the browser supabase client; RLS check `auth.uid()=customer_id` AND existence of a matching `service_requests` row in the WITH CHECK.
- Admin tab uses simple counts via supabase `select count`.

Confirm to proceed and I'll implement the migration first, then the UI changes.
