# Service Profile Redesign — Visual-First Listing

Transform the service profile from a personal-profile-styled page into a Jiji-inspired but Tuungane-branded service listing led by a swipeable photo/video gallery.

## 1. Backend — media support

New migration:
- `service_media` table: `id`, `service_user_id` (FK service_profiles), `kind` ('photo' | 'video'), `url`, `thumbnail_url` (nullable), `sort_order`, `is_cover` (bool), `duration_seconds` (nullable), `created_at`.
- Grants + RLS: public SELECT (`TO anon, authenticated`); owner-only INSERT/UPDATE/DELETE via `auth.uid() = service_user_id`.
- Add `price_display` (text, e.g. "From USh 50,000" | "Negotiable") and `price_min`/`price_max` (nullable numeric) to `service_profiles`.
- Storage bucket `service-media` (public read; owner-scoped write) with 25MB per file cap. Videos limited to 60s (enforced client-side).

## 2. New/updated components

- `ServiceMediaGallery` (new): large 16:9 hero, horizontal snap-swipe on mobile, dot pager + `1/N` chip, camera/video icon count. Video items render `<video muted playsInline preload="metadata" controls>` on tap, poster from `thumbnail_url`. Fallback = service logo / neutral placeholder — no banners.
- `ServiceMediaUploader` (new, used in create + edit): drag/drop or file picker, accepts images + `video/mp4|webm|quicktime`, previews with remove/reorder (dnd via simple up/down buttons for MVP), pick-cover toggle. Auto-generates video poster via a hidden `<video>` + canvas seek to 0.5s.
- `ServiceSummaryCard` (new): centered service name (2-line wrap), category · subcategory, location with verified badge inline, "Recently listed" chip if <7d, price display.
- `ProviderIdentityStrip` (new): small circular avatar + "Provided by <name>" → links to `/u/$id`.
- `ContactActions` (new): Orange "Message on Tuungane" (primary), outline "Call" (secondary). Green reserved for verified/availability. Quick-message chips ("Is this available?", "What is your price?", "Can you come today?", "I need this service") that prefill a new message thread.
- `OwnerToolsCompact` (new): single small row with Edit / Dashboard / Share — owner-only, no big orange panel.

## 3. Service profile page (`src/routes/p.$slug.tsx` and `src/routes/u.$id.tsx` for service view)

Order on mobile:
1. `ServiceMediaGallery`
2. `ServiceSummaryCard` (slightly overlapping gallery, -mt-6 rounded card)
3. `ProviderIdentityStrip`
4. `ContactActions` + quick-message chips
5. `OwnerToolsCompact` (owner only)
6. Tabs: About | Timeline | Services (Reviews removed)

Remove: `TrustStats`, existing large avatar hero, "Trust on Tuungane" section, banner remnants, big orange Owner tools panel.

About tab: description, category/subcategory, location, availability, price guide, contact preference.
Timeline tab: existing posts feed, extended to render video posts with play icon.
Services tab: current service details only — no multi-profile management UI.

## 4. Create/Edit service forms

- `src/routes/_authenticated/list-skill.tsx` and `ManageServiceDialog.tsx`: add `ServiceMediaUploader` section with helper text "Add photos or short videos of your work so customers can trust your service."
- Add price fields: dropdown for mode (From / Range / Negotiable / On request) + amount inputs; save to `price_display` + `price_min/max`.
- Cover selection: star icon on any media item → sets `is_cover`.

## 5. Service cards (Home, Services, Category, Search)

Update `HomeFeedSections.tsx`, `services.index.tsx`, `PopularCategoriesSection.tsx`, `NearYouHomeSection.tsx`:
- Fetch cover media (join to `service_media` where `is_cover` = true, fallback to first by `sort_order`, fallback to `cover_url`/avatar).
- If cover is a video: render poster + play-icon overlay; never autoplay on cards.
- Media count chip when >1.
- Verified badge fixed top-right, service name wraps to 2 lines with `line-clamp-2`.

## 6. Branding rules enforced

Navy for headings/trust text, orange only for primary CTAs, green only for verified/availability chips, white/`--muted` backgrounds. All via existing semantic tokens in `src/styles.css`.

## Technical notes

- Videos: HTML5 `<video>` only for MVP — no HLS/transcoding. Client validates size (≤25MB) and duration (≤60s) before upload.
- Thumbnails generated client-side at upload time, uploaded alongside the video as `<uuid>.jpg`.
- Storage path: `service-media/{user_id}/{uuid}.{ext}`.
- Backfill: existing `cover_url` values migrated into `service_media` as a single photo row with `is_cover = true`.

## Out of scope

- Server-side transcoding / adaptive streaming.
- Multi-service management UI.
- Reviews tab (explicitly removed for now).
- Drag-and-drop reorder library (using up/down buttons instead).

Approve and I'll implement in this order: migration → uploader + gallery components → profile page rewrite → create/edit forms → service card updates.