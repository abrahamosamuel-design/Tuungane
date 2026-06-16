
# Trust & Verification Center — MVP plan

## Guiding principle
"Anyone can create a profile. Trust grows in stages. Manual verification is reserved for stronger badges or flagged profiles." Trust is **profile-scoped**, never account-scoped.

A "profile" in this system = one row in either `service_profiles` (Individual or Business provider) or `business_pages` (Business / Organization). Each is keyed by `(profile_kind, profile_id)`.

---

## 1. Database (one migration)

New tables, all linked by `(profile_kind, profile_id)` where `profile_kind ∈ ('service_profile','business_page')`.

- `profile_trust_status` — current trust level per profile.
  - level enum: `new`, `phone_verified`, `profile_complete`, `reviewed_provider`, `verified_provider`, `verified_business`, `verified_organization`, `under_review`, `suspended`
  - `auto_level` (computed) vs `manual_level` (admin-set); displayed level = manual if set else auto.
- `profile_verification_requests` — voluntary requests for a Verified badge. status: `pending`, `more_info`, `approved`, `rejected`, `revoked`. Stores requested_type, submitted text fields.
- `verification_evidence` — file/link rows attached to a request (doc type + storage path; private bucket).
- `profile_reports` — replaces ad-hoc use of `reports` for profile-targeted complaints. Keeps existing `reports` table intact; new table just for profile reports with reason enum + status.
- `profile_admin_notes` — private notes (admins/mods only).
- `trust_audit_log` — every admin action (action, prev_level, new_level, reason, actor).
- `trust_settings` — single-row config table (manual verification open?, doc required?, completed-jobs threshold, review threshold, report auto-flag threshold, boosting allowed for unverified, etc.).

RLS:
- Owner can read their own profile's trust status, own verification requests, own evidence.
- Admins/moderators full read on all trust tables; only admin/mod can write admin notes, audit log, change manual_level, decide requests.
- Public can read **only** the displayed badge via a SECURITY DEFINER `get_profile_trust_badge(kind, id)` returning level + counts (no notes/evidence).
- Storage: new private bucket `verification-evidence` with RLS — owner upload, admin/mod read.

GRANTs included for all new public tables.

## 2. Auto trust progression
`recompute_profile_trust(kind, id)` SECURITY DEFINER function recalculates `auto_level` from:
- phone verified on owner (`auth.users.phone_confirmed_at` or owner profile)
- completeness: photo/logo, category, location, description, ≥1 service, contact set
- ≥1 completed `service_requests` + ≥1 verified review (uses existing `provider_trust_stats`)
Triggers call it on: profile update, service_request → completed, review insert, owner phone confirm. Manual levels (`verified_*`, `under_review`, `suspended`) override.

## 3. Admin UI — new "Trust & Verification" tab group in `src/routes/_authenticated/admin.tsx`

New components in `src/components/admin/trust/`:
- `TrustOverviewTab.tsx` — summary cards + "Needs Attention" list
- `VerificationRequestsTab.tsx` — queue + review drawer with Approve / Reject / Request Info / Revoke / Add Note
- `ReportedProfilesTab.tsx` — list with actions Dismiss / Warn / Under Review / Suspend / Revoke Verification
- `TrustStatusTab.tsx` — searchable table of all profiles with filters; row actions Change Level / Add Badge / Suspend / Restore / Note
- `AdminNotesTab.tsx` — searchable notes feed
- `TrustAuditLogTab.tsx` — filterable audit log
- `TrustSettingsTab.tsx` — form bound to `trust_settings`

Adds a new "Trust & Verification" group in `TAB_GROUPS` with the 7 tabs.

## 4. User-facing pieces (minimal)
- Profile edit page: "Request Verification" button → opens `RequestVerificationDialog` with the three forms (Individual / Business / Organization) and evidence uploader. Status banner shows current request state.
- Public profile card / page: small badge component `TrustBadge` rendering one of the 9 labels with color rules (green verified, navy neutral, amber under_review, red suspended). Replaces ad-hoc verified pills.
- Business/Org creation: notice text "Business and organization profiles may require verification before receiving verified trust badges…"
- Notifications via existing `create_notification` for: request received/approved/rejected/more_info/revoked, under_review, suspended, restored.

## 5. Ranking
Light touch: extend the existing search/list ordering to factor `trust_level_rank` (verified > reviewed > complete > phone > new; suspended/under_review demoted) instead of profile-kind. Concrete change: add an order term in `nearby_service_profiles`-style queries via a new SQL helper `trust_rank(kind, id)`. Detailed ranking overhaul is out of scope.

## 6. Migration of existing data
Backfill `profile_trust_status` for every existing `service_profiles` and `business_pages` row by running `recompute_profile_trust` once. Existing `verified` columns on those tables: map `verified` enum/text → `manual_level` (`'verified' → verified_provider/business/organization` based on row type); existing `suspended=true` → `manual_level='suspended'`. Existing `reports` rows targeting profiles are left intact; new reports go into `profile_reports`.

## 7. Out of scope for this MVP
- No phone OTP rewrite — relies on Supabase Auth's existing `phone_confirmed_at`.
- No automated document OCR.
- No ranking-engine rewrite beyond the single trust-rank term above.
- No public-facing changes to home/search layout other than the badge component swap.

---

## Technical notes

- All new tables get GRANT + RLS in the same migration.
- Storage bucket `verification-evidence` is private; signed URLs surface only to owner + admin/mod via a server function.
- `recompute_profile_trust` runs in triggers (`AFTER INSERT/UPDATE` on `service_profiles`, `business_pages`, `reviews`, `service_requests`).
- Admin write actions go through SECURITY DEFINER RPCs: `admin_set_trust_level`, `admin_decide_verification_request`, `admin_add_profile_note`, `admin_set_profile_status`. Each guards with `has_role(auth.uid(),'admin' or 'moderator')` and writes to `trust_audit_log`.
- UI uses existing semantic tokens (navy structure, orange CTAs, green verified, red warnings) — no new colors.

## Open questions before I start
1. Should the existing `verified` columns on `service_profiles` / `business_pages` be **kept in sync** with `profile_trust_status.manual_level`, or **deprecated** in favor of the new table only? (Sync is safer for current code; deprecate is cleaner.)
2. For Organization profiles — today every `business_pages.org_type` other than `'business'` qualifies as organization, correct? (Used to decide which "verified_*" badge a manual approval grants.)
3. Should boosting/feature placement be blocked for unverified profiles when the setting is off, or just hidden in UI? (Affects `create_boost` RPC.)
