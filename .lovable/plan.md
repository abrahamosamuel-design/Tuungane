## Homepage refinement plan

Scope: edit `src/routes/index.tsx` only. Generate new hero artwork. No DB, routing, or component-API changes.

### 1. Hero visuals (the main visible problem)

Current hero uses two small cutout PNGs (`hero-customer.png`, `hero-provider.png`) flanking the CTA stack in a 3-column grid — on mobile they render as ~176px tall floating stickers. Replace with a single, well-composed hero scene.

Approach:
- Generate ONE premium hero image with `imagegen` (standard quality, ~1280x900): a warm, mobile-friendly scene showing a Ugandan customer on a phone in the foreground and a skilled provider (e.g. plumber/electrician with tools, uniform) beside or behind her, framed naturally — not cutouts. Navy-friendly background so it blends into the hero. Save to `src/assets/` and upload via `lovable-assets`.
- New mobile-first hero layout (single column):
  - Headline + subtext (centered, top)
  - Two CTA buttons stacked full-width on mobile, side-by-side on sm+
  - Large hero image below CTAs, full-width, with soft radial navy gradient blending edges (no hard rectangle)
  - Trust strip remains as the overlapping white card
- Delete the 3-column grid + the two small `heroCustomer`/`heroProvider` `<img>` blocks. Delete the now-unused `.asset.json` imports. Keep the two asset files on disk (no delete) since cleanup isn't required for build.

### 2. Localize to Uganda + UGX

Rewrite the `openRequests` array in `src/routes/index.tsx` to:

| Title | Location | Budget | Badge |
|---|---|---|---|
| Fix leaking tap | Kitoro, Entebbe | UGX 30,000 – 60,000 | New |
| Power outage fix | Katabi, Entebbe | UGX 50,000 – 120,000 | Urgent |
| House cleaning | Kigungu, Entebbe | UGX 40,000 – 80,000 | Soon |

(Three cards keeps the existing 3-col grid balanced; the extra examples in the brief are kept in mind but not needed for the home preview.)

### 3. Categories

Update the "Popular categories" grid (`categories.slice(0,5)` + More). The shown set depends on `src/data/categories.ts`. I'll read it during build; if entries like "Home" appear in the first 5, swap to an explicit allow-list rendered in this order: Plumbing, Electrical, Cleaning, Mechanics, Beauty, then "More". Lookup each by slug from `categories`; fall back to skipping any missing one. No edits to `src/data/categories.ts`.

### 4. Show your work

Keep existing 4 cards. Update the fourth to `Sarah N. — Home cleaning services` for naming consistency with the brief. Names/categories already match otherwise. No image changes (Unsplash URLs are generic, not Kenya-specific).

### 5. Mobile polish

- Reduce hero top padding; tighten section vertical rhythm (`pt-10` → `pt-8` on small screens via responsive classes).
- Ensure CTA buttons are `w-full` on mobile, `sm:w-auto`.
- Consistent card radius (`rounded-2xl`) and `p-4 sm:p-5` across request + showcase cards.
- Confirm trust strip overlap (`-mt-20`) still works with the new hero height; adjust to `-mt-12 sm:-mt-16` if needed after preview.

### 6. Copy

Already aligned with brief ("Connect to trusted help nearby.", "Create a Request", "List Your Skill", "Open Requests near you", "Show your work"). No changes.

### Out of scope

- No changes to Header, Footer, MobileBottomNav, dashboard, login, or data files.
- No new routes, no DB migrations.
- Existing `hero-customer.png` / `hero-provider.png` assets remain in repo unused (safe; can be cleaned later).

### Files touched

- `src/routes/index.tsx` — layout, data, imports
- `src/assets/hero-uganda.jpg.asset.json` — new asset pointer (generated)
