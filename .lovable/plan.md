# Two-Sided Journey: Add the Provider Track

Goal: make Tuungane feel like a two-sided platform. Customer side stays untouched in behavior; provider side ("List Your Skill → show work → get discovered → respond → get hired") becomes visible in every key surface.

No backend / schema changes. All edits are copy, routing, navigation, and presentation.

## 1. Shared language + helpers

Create `src/lib/cta.ts` exporting:
- `CTA = { createRequest, listSkill, browseRequests, postYourWork, becomeProvider }` with label/href.
- `LIST_SKILL_HREF` → if signed-in & is_provider → `/dashboard`; else if signed-in → `/dashboard?becomeProvider=1`; else `/login?tab=signup&intent=provider`.

Add small reusable components in `src/components/cta/`:
- `<ListYourSkillButton variant="solid|outline|ghost" />` (green for provider track, per brand).
- `<TwoSidedHeroCards />` — the "Need help?" + "Have a skill?" pair used on home/services/requests pages.
- `<ProviderTrackCTA title text />` — compact banner for Services / Requests / empty states.

## 2. Homepage hero (`src/routes/index.tsx`)

- Heading: "Find trusted help. Grow your work." (already present — keep).
- Sub: "Create requests, discover skilled people, or list your skill so customers near you can find you."
- Primary CTA: orange "Create a Request" → `/requests/new`.
- Secondary CTA: green "List Your Skill" → `LIST_SKILL_HREF` (replaces current "Browse open requests").
- Tertiary text link "Browse Requests" → `/requests/browse`.
- Insert `<TwoSidedHeroCards />` immediately below hero (Need help? / Have a skill?).
- Replace bottom CTA "Post your skill. Get discovered." button target with `LIST_SKILL_HREF` and label "List Your Skill".

## 3. Header (`src/components/Header.tsx`)

- Desktop nav: Home, Services, Requests, Work Feed, Businesses (Work Feed promoted out of "More"; keep Community Feed / Official under More).
- Desktop right side (signed-out): "Sign in" + orange "Create a Request" + green outline "List Your Skill".
- Desktop right side (signed-in): keep orange "Create a Request"; add green outline "List Your Skill" pill.
- Mobile menu: order Home / Services / Requests / Work Feed / Businesses / Official; primary orange "Create a Request" + secondary green outline "List Your Skill".
- User dropdown: rename "Post a service" → "List Your Skill" pointing to `LIST_SKILL_HREF`.

## 4. Mobile bottom nav + create modal

- `MobileBottomNav.tsx`: tabs Home / Services / Create / Requests / Profile (already close; rename labels if needed).
- New `src/components/CreateChoiceSheet.tsx`: bottom sheet with two big options
  - "Create a Request — For customers who need help" → `/requests/new`
  - "List Your Skill — For skilled people who want to offer their work" → `LIST_SKILL_HREF`
- Wire the center "+" button to open the sheet instead of linking directly. `RequestFab` (desktop floating) opens the same sheet.

## 5. Services page (`src/routes/services.tsx`)

- Add `<ProviderTrackCTA title="Offer what you do" text="Create your provider profile, list your skills, add photos of your work, and let customers find you." button="List Your Skill" />` near the top (above Popular services).
- Replace the orange "Request a Service" mini-banner copy to keep customer track, but balance with the new provider banner.
- Provider list empty state ("No providers match your filters"): swap to the spec'd copy "No providers listed yet / Be among the first … / List Your Skill".

## 6. Requests page (`src/routes/requests.browse.tsx`)

- Below hero, add `<ProviderTrackCTA title="Want customers to find you too?" text="List your skill and show your work so people can discover you even before you respond to requests." button="List Your Skill" />`.
- Keep primary purpose (browsing requests) and the existing "Create a Request" CTA.

## 7. Work Feed (`src/routes/services.requests.tsx` is the current Work Feed entry; verify)

- Reframe header: "Work Feed — Show your work so customers can trust you."
- Provider post-type chips already exist; add a green "List Your Skill" CTA in the header for non-provider viewers.
- (No new data model; just copy + CTA placement.)

## 8. Empty states (`src/components/EmptyState.tsx` consumers)

Add a second `secondaryAction` prop for a provider-track CTA where relevant. Apply provider-track text to:
- Services provider list (already covered in §5)
- Work feed empty: "No work posts yet / Post photos or updates about your work to build trust with customers. — Post Your Work"
- Dashboard provider tiles when empty.

## 9. Dashboard (`src/routes/_authenticated/dashboard.tsx`)

Split layout by `profile.is_provider`:
- Customer view tiles: My Requests, Responses Received, Selected Providers, Completed Requests (derive from existing `service_requests` queries already loaded by `MyRequestsSummary`; add counts here).
- Provider view tiles: My Skills, My Work (posts), Open Requests (matching), My Responses, Profile Views (use existing stat if any; otherwise hide), Reviews, Completed Work.
- Honor `?becomeProvider=1` search param: auto-scroll/open the existing "Become a service provider" toggle and the `ServiceProfileForm`.

## 10. Sign-up flow (`src/routes/login.tsx`)

When `tab === "signup"`, replace the 2-option chooser with a 3-option chooser:
- "I need help — Create requests and find skilled people." → sets `userType=customer`.
- "I offer a skill — List your skill, show your work, get discovered." → sets `userType=provider`.
- "Both — Create requests and also offer your skills." → sets `userType=provider` and flags `intent=both` (provider profile + customer surfaces both available).

After signup:
- Customer → `/feed` or `redirect`.
- Provider / Both → `/dashboard?becomeProvider=1` to land directly on profile setup.

Pre-select option from `?intent=provider` in search params (so the homepage "List Your Skill" deep-link lands on the right option).

## 11. Footer (`src/components/Footer.tsx`)

Add a "For providers" mini-column with "List Your Skill", "Work Feed", "How to get discovered" (link to /about or /services).

## Technical notes

- All new copy lives in `src/lib/cta.ts` for single-source-of-truth — no scattered strings.
- Brand: orange for customer CTAs ("Create a Request"), green for provider CTAs ("List Your Skill"), navy for surfaces — matches existing tokens in `src/styles.css`.
- No DB migrations. No new tables. No changes to RLS or RPCs.
- Routing is unchanged except adding `?becomeProvider=1` (validated search param on `/dashboard`) and `?intent=provider|customer|both` (validated on `/login`).
- Verification: click through Home → Services → Requests → Work Feed → mobile bottom Create sheet; sign up as each of the 3 options; confirm provider dashboard surfaces.

## Out of scope (for a follow-up)

- New provider onboarding fields (years of experience, availability, price guidance, portfolio uploader) beyond what `service_profiles` already supports.
- Profile Views analytics (no counter exists yet).
- "Both" account merging UX beyond setting `is_provider=true`.