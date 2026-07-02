
## Goal

One Tuungane member account can own many **service profiles**. Remove "business page" language from the MVP. Public service cards lead with the service name the owner picked — never auto-prefix "By {owner}".

## What already works (keep)

- `public_profiles` table already supports many rows per `owner_id`.
- `MyProfilesPanel` already lists all a user's profiles and links to `/profiles/new` and `/profiles/$id`.
- `profile_services`, reviews (`public_profile_id`), requests (`public_profile_id`), and messaging already reference the specific profile.

So the backend model does not need a new table. The work is: **schema tightening + terminology + card display + creation flow**.

## Scope

### 1. Database (single migration)

- Rename `public_profiles.profile_type` usage so all new profiles default to `service` (keep enum values for back-compat; treat `business`/`organization` as legacy and hide their special UI).
- Ensure RLS lets an owner create N rows in `public_profiles` (already true — verify).
- Reviews/requests remain keyed to `public_profile_id` (already true).
- No destructive changes to `business_pages` — just stop routing users into it.

### 2. Creation flow

- `/profiles/new` (rename in copy to **"List a new service"**): drop the profile-type picker; every new profile is a service profile.
- Add helper text under **Service name**: *"This is what customers see on your service card. Use a service name, your own name, or a trading name."*
- Keep category, subcategory, location, short description, phone/messaging pref, photos.
- CTAs across the app: **"Add a service"**, **"List another service"**, **"Manage your services"**. Remove "Create business page", "Claim business", "Business profile".

### 3. Public service cards (the visible fix)

Files: `HomeFeedSections.tsx`, `services.index.tsx`, `services.$slug.tsx`, `PopularCategoriesSection.tsx`, `NearYouHomeSection.tsx`, `CommunityUpdatesSection.tsx`, `MatchingRequestsSection.tsx`, `ProviderCard.tsx`.

- Card title = `public_profiles.name` (the service name).
- Remove any "By {full_name}", "Owner:", "Posted by", "Provider:", "Member:" prefixes on card surfaces.
- Owner's real name still appears on the **detail page**, in messaging headers, admin, disputes, and trust surfaces.
- Verified pill stays top-right (already done in previous turn).

### 4. Member profile — "Services" tab

- `/u/$id` and `/me`: show a **Services** section listing every `public_profile` the member owns as its own card, with owner-only actions (edit / deactivate / add another).
- `MyProfilesPanel` already does this — flatten grouping, drop the "Personal / Business / Organization" headers, show one list titled **Your services** with an **Add another service** button.

### 5. Discovery / matching / reviews / messaging

- Services listings already union across profile types — keep as-is, just ensure card renderer uses the new title rule.
- Request matching, review targets, and message threads already reference the specific `public_profile_id` — verify and label the message thread header with the service name (`Contacting: Genesis Car Wash`).

### 6. Removed / hidden surfaces

- `businesses.index`, `businesses.new` already redirect — keep.
- Hide any remaining "Create business page" entry points in headers, CTAs, and dashboards.
- Keep `business_pages` table for legacy rows (admin can still view), but no new-user CTA links to it.

## Out of scope (call out)

- No WhatsApp contact re-addition.
- No changes to trust badges, boosts, or credits pricing.
- Legacy `business_pages` rows remain viewable in admin but are not surfaced in the public app.

## Deliverable order

1. Migration (default `profile_type='service'`, minor policy check).
2. Copy sweep: replace "business page/profile" language with "service"/"service profile" across UI.
3. `/profiles/new` simplified to a single service-profile form + helper text.
4. Card renderer changes across all listing surfaces (title = service name, no owner prefix).
5. `MyProfilesPanel` → **Your services** with **Add another service**.
6. Message thread header shows service name.
7. Verify request-matching and review flows already scope to `public_profile_id`; patch any that don't.

Approve and I'll start with the migration + copy/CTA sweep, then card renderers, then the creation form.
