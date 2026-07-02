## Goal

Refocus the service system on **multiple lightweight service profiles per user** with a simple public page (About / Timeline / Services), fix the "List service" prefill bug, remove the banner requirement, and move owner tools off the public view.

## 1. Fix the "List service opens ZeroSmoke" bug (highest priority)

Root cause: every "List service" CTA in the app points to `/list-skill`, which auto-loads the user's existing `service_profile` via `get_my_service_profile` RPC and upserts on a single row keyed by `user_id`. So a second click always reopens the first service.

Fix: point every create-service CTA to the already-correct `/profiles/new` flow (which inserts a fresh `public_profiles` row each time). Files to update: `src/lib/cta.ts`, `src/components/InstallPrompt.tsx`, `src/routes/index.tsx`, `src/routes/_authenticated/welcome.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/services.index.tsx`, `src/routes/profiles.index.tsx`, `src/routes/u.$id.tsx`, `src/components/HomeFeedSections.tsx`, `src/components/profiles/MyProfilesPanel.tsx`, `src/components/CreateChoiceSheet.tsx` (as applicable).

Retire `/list-skill` as a create/edit entry point: redirect `/_authenticated/list-skill` → `/profiles/new` for backward compatibility. Edit is handled per-service at `/profiles/$id`.

## 2. Remove the banner from service profiles

- `profiles.new.tsx` and `profiles.$id.tsx`: no banner UI, only a single square "service photo/logo" upload.
- `p.$slug.tsx`: remove the wide `CoverImage` header entirely. Show the square logo as the page's primary visual (larger, centered under a plain background strip).
- Keep the `cover_url` column in the DB (populated by the avatar upload) so existing card thumbnails still work.

## 3. Public service page (`/p/$slug`) — three tabs only

Rework layout to mirror the personal profile style but lighter:

```text
[ Square logo ]  Service name  [verified?]
                 Category · Subcategory · Location
                 [Request service]  [Message]  [Share]

Tabs:  About | Timeline | Services
```

- **About**: description, category/subcategory, location, areas served, availability, price guide, experience, verification, phone (only if owner allows public phone), contact preference. Owner sees a small pencil next to each editable block that deep-links to the matching field in `/profiles/$id`.
- **Timeline**: posts scoped to this service profile (see §5).
- **Services**: current `profile_services` list. Empty state: *"No services added yet. Add the specific things customers can request under this service."* Owner sees "Add service"; visitor sees "Request this service" per row.
- **Remove**: Reviews tab. Replace the current "★ — (0)" trust line with a small chip: `Verified service` / `Recently listed` / `X completed request(s)` depending on state.
- **Hide** the profile-strength checklist from the public view entirely. Visitors never see edit / add / manage / draft controls.

## 4. Owner vs visitor rendering on `/p/$slug`

Compute `isOwner = user?.id === profile.owner_id`. Owner gets an additional slim owner bar at the top with: *Edit service*, *Add timeline post*, *Add service*, *View dashboard*, and a compact profile-strength progress line (e.g. `Complete your service profile — 76% · Next: Set availability`). Visitors see none of these.

## 5. Timeline posts scoped per service profile

Add `public_profile_id uuid REFERENCES public.public_profiles(id) ON DELETE CASCADE` to `timeline_posts` (nullable so existing personal-profile posts keep working). Update:
- `PostComposer`: when composing from a service page, set `public_profile_id`; else leave null (personal post).
- Service-page Timeline tab: query `timeline_posts` filtered by `public_profile_id = profile.id`.
- Personal `/u/$id` timeline: keep current behaviour (all `provider_user_id = id`, all profiles combined) — no cross-mixing on service pages unless the owner cross-posts.

## 6. Dashboard service cards

Update `MyProfilesPanel` cards:
- Show square logo, service name (never owner name unless the user chose it), category · subcategory · location.
- Status pill: `Published` / `Draft` / `Incomplete` / `Verified`.
- Draft state: "Not visible to the public yet" with actions *Continue editing*, *Publish*, *Delete draft*.
- Published: *View public page*, *Edit service*, *Manage service*.
- Move profile-strength checklist here (already lives at `/profiles/$id` — keep it there and stop rendering it publicly).

## 7. Service card click behaviour

Cards in `HomeFeedSections` and `/services` already link to `/p/$slug`. Audit and confirm no card wrapper accidentally opens the setup form; ensure `Request Service` and `Message` are separate `stopPropagation` buttons.

## 8. Create vs edit form isolation

`/profiles/new` already starts blank and inserts new rows — keep it. Add a light duplicate-name check on submit: if the user already owns a `public_profiles` row with the same normalized name + category + town, show a non-blocking warning *"You may already have a similar service profile"* with links to *View existing* / *Edit existing* / *Continue creating*. `/profiles/$id` remains the edit surface (loads only that id).

## 9. Copy sweep

Remove remaining "business page / business profile" strings in user-facing surfaces; replace with "service profile" / "service page". Admin/legacy internal wording can stay.

## Out of scope for this pass

- Rebuilding a reviews UI (backend reviews stay, just no tab).
- Payment flows, boost redesign, notification-matching internals.
- Renaming DB tables (`public_profiles`, `profile_services` stay as-is).

## Technical notes

- One migration: `ALTER TABLE public.timeline_posts ADD COLUMN public_profile_id uuid REFERENCES public.public_profiles(id) ON DELETE CASCADE; CREATE INDEX ...`. No new RLS needed — existing owner/hidden policies cover it via `provider_user_id`.
- No changes to `service_profiles` table (legacy single-row provider record). All new work uses `public_profiles`.
- Redirect old `/list-skill` route to `/profiles/new` to preserve external links.
- `p.$slug.tsx` becomes the single source of truth for the public page; tab state via `Tabs` from `@/components/ui/tabs`.
