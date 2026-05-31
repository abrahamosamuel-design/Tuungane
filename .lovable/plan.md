## Goal
Add one official "Tuungane Official" account that admins can manage and use to seed/post official content (opportunities, featured providers, safety tips, platform updates). Build both backend + visible UI.

## 1. Database migration

**New enum** `official_post_type`: `opportunity, featured_provider, verified_provider, service_highlight, safety_tip, platform_update, user_education, new_feature, announcement`.

**New enum** `claim_status`: `pending, approved, rejected`.

**New enum** `seeded_status`: `unclaimed, claim_pending, claimed`.

**`official_accounts`** (singleton-ish, admin-only writes):
- `id`, `name` (default "Tuungane Official"), `bio`, `tagline`, `profile_image_url`, `cover_image_url`, `is_official` (true), `is_verified` (true), `is_active`, `created_by_admin_id`, timestamps.
- RLS: public read; admin insert/update.

**`official_posts`**:
- `id`, `official_account_id`, `post_type` (official_post_type), `title`, `content`, `category_slug`, `subcategory`, `location`, `image_url`, `linked_provider_id` (uuid → service_profiles.user_id), `linked_opportunity_id` (uuid → opportunities.id), `is_featured`, `is_pinned`, `status` (text: draft/published), `expires_at`, timestamps.
- RLS: public read where status='published'; admin all.

**`profile_claim_requests`**:
- `id`, `service_profile_user_id` (uuid), `requester_user_id`, `full_name`, `phone_number`, `whatsapp_number`, `email`, `relationship_to_profile`, `explanation`, `supporting_file_url`, `status` (claim_status), `reviewed_by_admin_id`, `reviewed_at`, `created_at`.
- RLS: requester read own, admin read all; insert by authed user as self; admin update.

**`service_profiles`** additions:
- `seeded_by_official` boolean default false
- `seeded_status` seeded_status nullable

**Reuse existing**: `post_comments`, `post_likes`, `reports`, `saved_*` already exist. For likes/comments/saves/reports on official posts we'll keep them in their existing tables but use `target_type='official_post'` for reports; for likes/comments on official posts we'll add lightweight `official_post_likes` and `official_post_comments` (mirror existing patterns, RLS like timeline_posts).

Actually — to keep scope tight and reuse UI components, store official posts in the existing `timeline_posts` table is messier (different shape). I'll create dedicated `official_post_likes` and `official_post_comments` tables mirroring `post_likes`/`post_comments` schemas.

GRANTs on every new table for `authenticated` + `service_role`; public SELECT where appropriate.

## 2. Admin dashboard — `/admin` new tab "Official"

Adds a new top-level tab in the existing `src/routes/admin.tsx`. Sub-sections:
1. **Account Setup**: form to create/update the singleton official account (name, bio, tagline, upload profile image, upload cover image, toggle active/official/verified).
2. **Create Official Post**: form with post type select, title, content, category/subcategory, location, image upload, linked provider (search by id/name), linked opportunity (search), expires_at, featured, pinned, publish toggle.
3. **Manage Official Posts**: list with edit/delete/pin/feature/unpublish.
4. **Seeded Providers**: list `service_profiles` where `seeded_by_official=true`; let admin toggle seeded_status, edit, mark verified/featured.
5. **Claim Requests**: list pending claims; approve (reassigns `service_profiles.user_id` to requester, sets seeded_status='claimed') / reject.

## 3. Public UI

**New components**:
- `src/components/OfficialBadge.tsx` — official + verified badges.
- `src/components/OfficialPostCard.tsx` — renders official post with post-type label, image, like/comment/share/save/report, "View Profile" / "View Opportunity" buttons when linked.
- `src/components/ClaimProfileDialog.tsx` — form on unclaimed seeded provider profiles.

**New route**: `src/routes/official.tsx` — Tuungane Official profile page (cover, avatar, bio, tagline, official + verified badges, tabs: Posts, Opportunities, Featured Providers, Safety & Updates). Also `src/routes/official-posts.$id.tsx` for detail.

**Homepage `src/routes/index.tsx`**: new "From Tuungane Official" section showing featured/pinned official posts (max 3-4 cards) with link to `/official`.

**Feed `src/routes/feed.tsx`**: in Posts tab, prepend pinned official posts; add "Official" filter chip to show only Tuungane Official posts.

**Opportunities `src/routes/opportunities.tsx`**: show official `post_type='opportunity'` posts alongside user opportunities (mapped into the same card list); filter chips: All / Posted by Tuungane Official / Posted by users / Featured / Verified. Add visible "Posted by Tuungane Official" label.

**Services `src/routes/services.tsx`**: add filter chips "Featured by Tuungane", "Verified Providers", "Recently Added". Provider cards show "Highlighted by Tuungane Official" or "Added by Tuungane Official" labels where applicable.

**Provider profile `src/routes/providers.$id.tsx`** (or `u.$id.tsx`): if profile is `seeded_by_official` and `seeded_status != 'claimed'`, show "Added by Tuungane Official" banner + "Claim this profile" button that opens `ClaimProfileDialog`. Show explanation text for unclaimed.

## 4. Safety/transparency
- Each official opportunity card includes a small safety note.
- Unverified-source official opportunities show "Source not independently verified".
- Verified opportunities show "Verified by Tuungane".

## Out of scope
- Multiple official accounts.
- Hard-coded credentials (admin creates via UI).
- Auto-seeding fixtures (admin posts content manually).
- Migrating likes/comments on official posts into existing tables (separate dedicated tables).
- Rich realtime — basic reads only.

## Files
**Migration**: `supabase/migrations/<ts>_official_account.sql`

**New code**:
- `src/components/OfficialBadge.tsx`
- `src/components/OfficialPostCard.tsx`
- `src/components/ClaimProfileDialog.tsx`
- `src/components/admin/OfficialAccountForm.tsx`
- `src/components/admin/OfficialPostForm.tsx`
- `src/routes/official.tsx`
- `src/routes/official-posts.$id.tsx`
- `src/data/officialPostTypes.ts`

**Edits**:
- `src/routes/admin.tsx` — add "Official" tab + sub-tabs
- `src/routes/index.tsx` — homepage "From Tuungane Official" section
- `src/routes/feed.tsx` — pinned + filter
- `src/routes/opportunities.tsx` — merge + filters + label
- `src/routes/services.tsx` — filters + labels
- `src/routes/providers.$id.tsx` — claim banner
- `src/components/Header.tsx` — link to /official (optional small)

This is a big migration + ~10 new files + 6 edits. Approve and I'll run the migration first, then build the UI.
