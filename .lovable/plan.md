# Tuungane Feed Card Redesign

A unified, mobile-first feed-style card system inspired by modern social feeds (avatar left, metadata top, expandable text, image grid, action row) — built with Tuungane's brand (navy / orange / green, white card, soft borders, rounded corners). No X branding, no WhatsApp.

## Scope

1. New reusable card system used by Provider Service Cards and Service Request Cards (and ready for Portfolio/Completed Work cards later).
2. Image attachment support on both Service Listings and Service Requests, including create/edit forms.
3. Long-description support with Show more / Show less.
4. Replace weak trust labels ("No reviews yet", "New provider") with softer phrasing.
5. Keep all existing functionality (filters, search, navigation, request flows, phone contact where already allowed).

## New / refactored components

Created under `src/components/feed/`:

- `FeedCard` — base shell (avatar + header + body + media + actions).
- `FeedCardHeader` — avatar, name, verification badge, category chip, location, time, overflow menu.
- `ExpandableText` — 4–6 line preview on mobile, expands; reuses pattern from existing `PostText`.
- `MediaGrid` — 1–4 image responsive grid with `+N` overlay, rounded corners, lightbox via existing dialog.
- `ActionButtonRow` — primary + secondary actions with consistent sizing/tap targets (44px min).
- `LocationBadge`, `UrgencyBadge` — small chips reusing existing tokens.

New consumer cards:

- `ProviderServiceCard` (replaces existing `ProviderCard` usage in feeds; old `ProviderCardCompact` kept for the compact carousel on Services page).
- `ServiceRequestFeedCard` (replaces homepage `RequestCard` and the requests browse list card; the dashboard `ServiceRequestCard` stays as-is — it's a workflow/management card, not a feed card).

Reused as-is: `TrustBadge`, `Avatar` (`social/Avatar`), `NearYouBadge`, `BoostBadge`, `ContactProviderModal`, `ProviderResponseDialog`, `MessageButton`, lightbox dialog primitives.

## Card structure

Top row: avatar · name + verification · category · location · time · ⋯ menu.
Body: title, expandable description (4–6 lines mobile, 6–8 desktop), supporting chips (budget, urgency, availability, price guidance).
Media: 1–4 image grid; tap → lightbox; "+N" overlay; no reserved space when empty.
Actions:
- Provider card: **Request Service** (primary, orange) · Message · Call (if `contact_phone` allowed) · Save · View Profile (in overflow on mobile).
- Request card: **Send Quote / Respond** (primary, orange) · Message · Save · Share · View Details (overflow).

## Soft trust language

Mapping applied in `TrustBadge` and provider cards:

- "No reviews yet" → omitted, or "Profile details available".
- "New provider" → "Recently joined" / "Available for requests".
- Existing verified / claimed / trusted tiers unchanged.

## Image attachments

Database (one safe additive migration):

- Add `media_urls text[] not null default '{}'` to `service_profiles` (provider listings) and `service_requests`. Existing single `attachment_url` on `service_requests` is preserved and backfilled into `media_urls` at read time so nothing breaks.
- No RLS / GRANT changes (columns inherit existing table grants and policies).

Storage: reuse existing `tuungane-media` bucket via `src/lib/upload.ts`. Add a small `MediaUploader` component (multi-select, max 6, type/size validation, per-file progress, remove-before-submit, mobile-friendly file input + camera capture). Used by:

- `src/routes/_authenticated/requests.new.tsx` (Service Request form).
- `src/routes/_authenticated/profiles.new.tsx` and `profiles.$id.tsx` (Provider Service listing form/edit).

Read path: `media_urls` (fallback to `[attachment_url]` for requests) is passed into `MediaGrid`.

## Feed integrations

Swap card components in:

- `src/components/HomeFeedSections.tsx` — homepage "Latest open requests" + "Recently listed services".
- `src/routes/services.index.tsx` — main provider list (compact carousel keeps `ProviderCardCompact`).
- `src/routes/requests.browse.tsx` and `src/routes/services.requests.tsx` — request feeds.
- `src/components/NearYouHomeSection.tsx`, `MatchingRequestsSection.tsx` — wherever full provider/request cards are rendered.

Existing filters, sort, search, `useUserLocation`, and pagination untouched.

## Mobile-first details

- Full-width card with 16px padding; 12px on <360px.
- Body text 15–16px, line-height 1.55.
- Tap targets ≥44px (already enforced globally).
- Image grid: 1 image full width 16:9; 2 = side-by-side 1:1; 3 = 1 large + 2 stacked; 4 = 2×2.
- Sticky-safe spacing for bottom nav (existing `pb-32` patterns).

## Out of scope (explicit)

- No WhatsApp anywhere.
- No changes to dashboard workflow `ServiceRequestCard` (status flow, accept/complete buttons) — it's not a feed card.
- No new auth / role / RLS changes.
- No destructive migrations.

## Technical notes

- Migration order respects `<public-schema-grants>`: columns added to existing tables, so no new GRANT block needed; RLS unchanged.
- Image upload via existing `uploadMedia()` — signed publishable client, RLS enforced.
- Lightbox: existing `Dialog` primitive + `<img>`; no new dep.
- All new components typed; no `any`.
- Tokens only — no hardcoded hex.

## Acceptance check before finishing

- Provider + request cards render correctly with 0, 1, 2, 3, 4, and 6 images on 360px and 1280px viewports (Playwright screenshots).
- Show more / Show less works and doesn't shift layout above the card.
- Request creation with 3 images persists `media_urls` and renders in feed.
- Existing routes still build and navigate.
- No "No reviews yet" / "New provider" text remains in feed cards.
