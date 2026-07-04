## Goal

Introduce a unified **Profile Identity** system (Individual vs Institution/Organisation) and derive **roles/badges** (Offers Services, Requester, etc.) from activity — replacing any "customer vs provider" split. Keep existing data, posts, listings, followers intact.

---

## 1. Database changes (single migration)

Add to `public.profiles`:
- `profile_identity` text, check in (`'individual'`, `'institution'`), default `'individual'`, not null
- `organisation_name` text
- `organisation_type` text (enum-like, free text with app-level validation)
- `contact_person` text
- `registration_status` text
- `description` text
- `org_phone` text, `org_email` text (org contact, separate from user auth email)

Backfill: all existing rows → `individual`.

Create SQL helper views / RPCs (optional, cheap):
- `profile_offers_services(profile_user_id uuid) returns boolean` — true if any active row exists in `public_profiles` or `service_profiles` owned by that user (reuse existing tables — no new `services` table; the request's suggested schema overlaps with what already exists).
- `profile_is_requester(profile_user_id uuid) returns boolean` — true if any `service_requests` row exists.

Keep RLS as-is; new columns inherit existing policies. Add explicit `GRANT` re-check not needed (columns added, table grants already exist).

**Note:** The user's suggested `services` table already exists as `service_profiles` / `public_profiles`. Reuse those. The `institution_details` fields are folded into `profiles` for MVP simplicity (matches the "no separate business pages" instruction).

---

## 2. Onboarding flow (post-signup)

New route: `src/routes/_authenticated/onboarding.tsx` — two-step wizard shown once, right after signup, before `/welcome`:

**Step 1 — "How are you joining Tuungane?"**
- Individual Profile
- Institution / Organisation Profile

If Institution selected → lightweight inline fields (org name, org type dropdown, location). Everything else editable later.

**Step 2 — "What would you like to do first?"**
- Find a service → `/services`
- Post a service request → `/requests/new`
- List my service → `/profiles/new`
- Explore Tuungane → `/`

Writes `profile_identity` (+ org fields if institution) to `profiles`, then routes based on Step 2. Skippable.

Redirect logic: in `_authenticated/route.tsx` (or a small effect in `__root.tsx` auth hook), if `profile_identity` is null/unset AND user just signed up, push to `/onboarding`. Otherwise leave `/welcome` behavior alone.

---

## 3. Profile Settings — "Profile Identity" section

In `src/routes/_authenticated/settings.tsx`, add a new card:
- Radio: Individual / Institution
- When Institution selected: show org fields (name, type, contact person, phone, email, description, registration status)
- Save button → updates `profiles`
- Copy note: "Changing identity does not delete your posts, listings, requests, followers, or messages."

Org type options (constant in `src/data/organisationTypes.ts`):
School, Vocational Institute, NGO, Church, Community Group, Association, SACCO, Company, Training Center, Health Facility, Government, Other.

---

## 4. Badges — derived, not stored

New helper `src/lib/profile-badges.ts`:
- `getProfileBadges(profile, counts) → { identity, offersServices, requester, verified, ... }`
- `identity` from `profile_identity`; `offersServices` from `public_profiles`/`service_profiles` count > 0; `requester` from `service_requests` count > 0.

New component `src/components/profile/IdentityBadges.tsx` renders chips: `Individual Profile` / `Institution Profile`, `· Offers Services`, `· Requester`, verified check.

Wire into:
- `src/routes/u.$id.tsx` (public individual profile view)
- `src/routes/_authenticated/me.tsx` (my profile header)
- `src/components/ProviderCard.tsx` (service/provider cards)
- `src/routes/p.$slug.tsx` (public service profile view)

For institutions, header shows organisation name + org type + contact person instead of personal name.

---

## 5. Language sweep

Replace user-facing "Customer" with neutral copy. Grep-and-edit pass across:
- `CreateChoiceSheet.tsx`, `welcome.tsx`, hero cards, empty states, dialogs.
- Use "Member" / "Tuungane member", "Requester" (only when they've posted), "Offers Services" (only when they've listed).

Do **not** touch DB column names that use "customer" internally (if any) — UI only.

---

## 6. Service listing eligibility

- Keep `List Your Service` available to every signed-in user regardless of identity (already the case).
- After a user creates their first `public_profile` / `service_profile`, the derived `offersServices` badge appears automatically — no code change needed beyond the badge helper.
- Institution profiles list services under the same account; no separate business page flow added.

Explicitly leave existing `business_pages` code untouched (per "no separate business pages for MVP" — existing routes stay but new onboarding does not push users there).

---

## 7. Out of scope for this change

- Not renaming DB columns.
- Not modifying `business_pages` table or routes.
- Not touching messaging, credits, boosts, trust system.
- Not adding a new `services` table (existing `public_profiles` / `service_profiles` cover it).

---

## Files touched (approx)

**Migration**
- `supabase/migrations/<new>.sql`

**New**
- `src/routes/_authenticated/onboarding.tsx`
- `src/data/organisationTypes.ts`
- `src/lib/profile-badges.ts`
- `src/components/profile/IdentityBadges.tsx`

**Edited**
- `src/routes/_authenticated/settings.tsx` — Profile Identity section
- `src/routes/_authenticated/route.tsx` or `use-auth.tsx` — first-run redirect to onboarding
- `src/routes/_authenticated/welcome.tsx` — softened wording, still available
- `src/routes/_authenticated/me.tsx` — identity badges
- `src/routes/u.$id.tsx`, `src/routes/p.$slug.tsx` — identity display
- `src/components/ProviderCard.tsx`, `src/components/CreateChoiceSheet.tsx` — neutral wording, identity chip
- `src/integrations/supabase/types.ts` — regenerated after migration approved

---

## Rollout order

1. Ship migration (adds columns, defaults everyone to `individual`).
2. Add badge helper + Identity component (safe no-ops until wired).
3. Add onboarding route + settings section.
4. Wire badges into profile pages and cards.
5. Copy sweep for "customer" → "member".

Nothing here is destructive; existing users become Individual by default and can switch any time.
