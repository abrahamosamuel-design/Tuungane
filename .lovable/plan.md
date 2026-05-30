
## Goal

Turn the existing Tuungane MVP into a living, social, services-focused platform — LinkedIn-style profiles + Facebook-style timelines + services/opportunities. Keep all existing features (services directory, opportunities) intact.

The DB schema already supports most of this (profiles, service_profiles, timeline_posts, post_likes, post_comments, follows, reviews, provider_recommendations, saved_providers, opportunities, saved_opportunities). The main gap is the **UI experience** plus a small **notifications** table and a `post_type` column on posts.

## Scope (what I will build)

### 1. Database (one migration)
- Add `post_type` enum to `timeline_posts` (work_update, completed_job, available, before_after, new_service, promotion, opportunity_shared).
- Add `cover_url` to `service_profiles` (banner image).
- New `notifications` table: `id, user_id, actor_id, type, target_type, target_id, message, read, created_at` with RLS (owner read/update, system insert via triggers).
- DB triggers to create notifications on: new follow, new like, new comment, new recommendation, new review.

### 2. Redesigned provider profile (`/providers/$id`)
- **Profile header**: cover banner + circular avatar, name, service title, category/subcategory, location, verified badge, rating, follower count, recommendation count, action row (Follow, Contact, WhatsApp, Recommend, Share).
- **Tab bar**: Timeline (default), Portfolio, Services, Recommendations, Reviews, Opportunities, About — sticky on scroll, mobile-scrollable.
- **Timeline tab**: PostComposer (if owner) + post list with inline comments, likes, recommend, share, contact buttons.
- **Portfolio tab**: gallery grid of posts that have media.
- **Services tab**: service offering card (name, description, areas, availability, price range, contact).
- **Recommendations tab**: list of recommendations + "Recommend" CTA.
- **Reviews tab**: average rating, breakdown bars, review list + "Write review" CTA.
- **Opportunities tab**: opportunities posted by this user.
- **About tab**: bio, years experience, skills, areas, contact, verification.

### 3. Customer profile (`/u/$id`)
- Lightweight profile: avatar, name, location, bio, followers/following, tabs for Posts, Recommendations given, Reviews written, Saved providers.

### 4. Post interactions
- Inline comment thread under each `PostCard` (toggle to expand, list + composer).
- Like/comment counts visible at all times.
- Add `post_type` selector to composer; show as tag on cards.

### 5. Feed enhancements (`/feed`)
- Add tabs for Services, Opportunities (alongside All, Following, Nearby, Popular, Verified).
- Opportunities tab renders OpportunityCards inline.

### 6. Notifications
- `/notifications` route: list of notifications grouped by date.
- Bell icon in header with unread badge; dropdown preview.
- Mark-read on open.

### 7. Navigation
- Desktop header: add Notifications bell.
- New mobile bottom nav (sticky): Home, Feed, Services, Post (+ sheet to pick: Work update / Service / Opportunity), Profile.

### 8. Dashboard updates
- Provider dashboard: profile completion %, followers, likes received, comments received, recommendations, reviews, saves, quick post + edit profile buttons.
- Customer dashboard: saved providers, followed providers, opportunities saved, reviews written, recommendations made.

## Out of scope (per your "Do Not Build")
Messaging, groups, entertainment feed, dating, grants/scholarships, generic academic opportunities, profile views tracking (would need pageview infra), video uploads (will keep image-only for now — Cloud Storage video transcoding is heavy).

## Technical notes
- All UI uses existing semantic tokens (`navy`, `orange`, `surface`, etc.).
- Notification triggers use `SECURITY DEFINER` functions to bypass RLS on insert.
- Cover image upload reuses `uploadMedia` to `tuungane-media` bucket under `covers/`.
- Mobile bottom nav hidden on `md+`; existing top nav hidden on mobile when bottom nav present.

## Files (high level)
- `supabase/migrations/<ts>_social_layer.sql` — schema + triggers
- `src/routes/providers.$id.tsx` — full redesign
- `src/routes/u.$id.tsx` — customer profile redesign
- `src/routes/notifications.tsx` — new
- `src/routes/feed.tsx` — add tabs
- `src/routes/dashboard.tsx` — stats overhaul
- `src/components/ProfileHeader.tsx` — new
- `src/components/ProfileTabs.tsx` — new
- `src/components/MobileBottomNav.tsx` — new
- `src/components/NotificationsBell.tsx` — new
- `src/components/social/PostCard.tsx` — inline comments, post_type tag
- `src/components/social/PostComposer.tsx` — post_type selector
- `src/components/social/CommentThread.tsx` — new
- `src/components/Header.tsx` — bell
- `src/components/Layout.tsx` — mount mobile nav

This is one large coordinated change. Approve and I'll execute the migration first, then ship the UI.
