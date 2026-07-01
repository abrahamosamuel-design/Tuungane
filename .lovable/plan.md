# Guest Browsing Mode

## Root cause of current "empty for guests"

Live check confirmed the problem: guest requests to `service_requests`, `service_profiles`, and `public_profiles` are returning **401 Unauthorized**. Past security work revoked anon SELECT on contact + coordinate columns, but no anon SELECT was ever granted on the safe subset — so guests can't read anything. Skeletons stay forever.

The fix is not to relax security; it's to add narrow, column-scoped anon read paths and update the client queries to only request safe columns when signed out.

## Plan

### 1. Database — safe anon reads (migration)

Add `TO anon` SELECT policies + column-level GRANTs on the guest-safe subset only:

- `service_profiles`, `public_profiles` (anon): `user_id/owner_id, business_name/name, category_slug, subcategory, bio, town, district, verified, availability, cover_url, avatar_url, years_experience, service_radius_km, created_at, updated_at`. **Excluded from anon:** phone, email, whatsapp, latitude, longitude, area, exact address, contact_preference.
- `service_requests` (anon, only where `visibility='public' AND status='requested'`): `id, title, service_needed, description, budget_range, urgent_flag, urgency, created_at, district, town, category_slug, subcategory, preferred_date`. **Excluded:** customer_id (or exposed only as opaque), phone/contact fields, latitude, longitude, area, attachment_url, media_urls (unless already public-safe).
- Keep existing authenticated policies untouched.

### 2. Client — split queries by auth state

For every guest-visible feed (`HomeFeedSections`, `services.index`, `requests.browse`, `providers.$id`, category pages):

- When `!user`, project only the safe columns above.
- Never call `useUserLocation`-based proximity queries; sort by `verified` + `updated_at`.
- Never render phone, email, exact area/coordinates, or media requiring signed-in view.

### 3. Sign-in gate — `RequireAuthDialog`

New `src/components/RequireAuthDialog.tsx` and hook `useAuthGate()`:

- Title: "Create a free Tuungane account"
- Body: "Sign up to contact providers, respond to requests, post your own request, and grow your opportunities on Tuungane."
- Buttons: **Create account** → `/login?tab=signup&redirect=...`, **Sign in** → `/login?redirect=...`, **Continue browsing** → close.

Wire the gate into every protected action for guests (no navigation for signed-in users):

- `MessageButton`, `ProviderQuickContact` (Call + Message), `SaveButton`, `ProviderResponseDialog` trigger, "Request service", "Post request" FAB, "List your service", follow, review, recommend, report.

Guest provider cards should still render **View profile**, **Message**, **Call** buttons (the last two open the gate on click) so the UI never looks half-empty.

### 4. Public content safety

- `maskProfileLocation` already handles owner masking; extend so guest viewer forces `district`-level precision regardless of stored visibility.
- Provider profile route (`/u/$id`, `/providers/$id`) loads only guest-safe columns for anon; hide contact strip; show "Sign in to see contact options".
- Suspended / flagged / incomplete profiles: existing `suspended=eq.false` filter kept; also require `verified != 'flagged'` for guests.

### 5. Empty & loading states

Replace endless skeleton with:
- After successful fetch with 0 rows: friendly empty state ("No providers found yet in this category. Be among the first to list your service.") with CTA button that opens the auth gate.
- Loading skeleton shown only during first fetch, capped to <8 items.

### 6. Routing

- No changes to `_authenticated/` gate — keep dashboard, messages, notifications, credits, settings, requests.new, list-skill, profiles.new protected.
- Remove any incidental redirects from public marketplace pages (spot check `services.index`, `requests.browse`, `providers.$id`, `p.$slug`, `services.$slug`, `u.$id`).

### 7. Verification

Playwright pass as anonymous user:
- `/`, `/services`, `/requests/browse`, one category page, one provider profile → content renders, no 401s.
- Click Message, Call, Save, Respond, Request service, Post request → auth dialog appears; browsing not blocked.
- Confirm no phone/email/lat/lng in the network responses for anon.

## Technical notes

- Migration adds policies **and** column-level `GRANT SELECT (col1, col2, ...) ON public.<table> TO anon`.
- Existing `authenticated` grants stay `GRANT SELECT` (all columns) so signed-in flows are unchanged.
- Public-safe media (`cover_url`, `avatar_url`) are already storage-public; `media_urls` remains authenticated-only for now to avoid leaking unreviewed content.
- No changes to messaging, contact_logs, contact_reveals, or `get_provider_contact` RPC — those stay authenticated.

Scope is bounded to guest-read surface + a single reusable auth-gate dialog; existing signed-in behavior is untouched.
