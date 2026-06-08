## Goal

Shift Tuungane from a bluish dashboard look to a white, black-text, Facebook/LinkedIn-style reading experience — without touching the homepage hero or the footer, and without changing functionality.

## Approach: token-level retune (single source of truth)

Most pages already consume semantic tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `text-navy`, etc.) defined in `src/styles.css`. Rather than touching dozens of components, we rewrite the tokens. This propagates the new look platform-wide automatically.

### 1. `src/styles.css` — token rewrite

Replace the current oklch palette with the requested Facebook/LinkedIn-style values:

```
--background:        #FFFFFF
--surface:           #FFFFFF
--card:              #FFFFFF
--foreground:        #050505   (near-black main text)
--muted:             #F0F2F5   (soft grey input/section bg)
--muted-foreground:  #65676B   (secondary text)
--border:            #DADDE1
--input:             #DADDE1
--secondary:         #F0F2F5
--secondary-foreground: #050505
--popover / -fg:     #FFFFFF / #050505

--navy:    #0B1F3A  (kept as brand accent only)
--orange:  #FF6B1A  (primary CTA — unchanged role)
--green:   #22A652  (trust/verified — unchanged role)
--ring:    --orange
```

Font stack (replace Plus Jakarta / Inter defaults):

```
--font-sans:    system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif
--font-display: same stack (kept as variable so existing `font-display` classes still resolve, just no longer a distinct serif/display face)
```

Base typography (added to `@layer base`):
- `html { font-size: 16px }`
- body text default 15–16px (Tailwind `text-sm`/`text-base` already maps here)
- headings: keep bold but recolor to `--foreground` (remove the implicit navy tint by not overriding color in base; `text-navy` classes that components opt into still work)

Shadows softened to grey instead of navy-tinted:
- `--shadow-card: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)`
- `--shadow-elevated: 0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.10)`

Keep `--gradient-hero` exactly as-is (used by the homepage hero — must not change).

Mobile gutter rules at the bottom of `styles.css` stay.

### 2. Protect the hero and footer

- `src/routes/index.tsx` hero: it uses `--gradient-hero` and explicit `text-navy-foreground` / orange / green classes. Since `--gradient-hero` and the brand tokens (`--navy`, `--orange`, `--green`) are preserved, the hero renders unchanged. No edits to `index.tsx` hero markup.
- `src/components/Footer.tsx`: uses its own dark navy background classes (`bg-navy`, `text-navy-foreground`). With `--navy` preserved, the footer renders unchanged. No edits to `Footer.tsx`.

### 3. Targeted component nudges (small, surgical)

A few components hardcode `text-navy` for body-level text where it should now be near-black for readability. Limited list:

- `src/components/social/PostShell.tsx` — already uses `bg-card` + `text-foreground/90`, picks up new tokens automatically. No change.
- `src/components/social/PostText.tsx` — uses `text-foreground/90`. No change.
- Comment bubbles (wherever they currently render) — ensure background is `bg-muted` (now `#F0F2F5`) with `rounded-2xl`. Audit `PostCard`/comment renderers and adjust only if they use navy.
- Headings across pages that use `text-navy` as the default body heading color (e.g. `font-display ... text-navy`): we keep these — `--navy` is now `#0B1F3A` which reads as near-black and matches the "navy as accent for headings is fine" reading. So no mass find/replace needed.

We will NOT do a sweeping find/replace of `text-navy` → `text-foreground`. The new `--navy` (#0B1F3A) is already a deep near-black that reads cleanly on white, matching the FB/LinkedIn feel while preserving brand identity.

### 4. QA pass

After the token rewrite, visually verify on mobile viewport:
- Home (hero unchanged, sections below now white with black text)
- Footer unchanged
- Services, Services/$slug, Providers/$id
- Feed, Official, Business pages
- Requests new / browse / detail
- Dashboard, Admin, Settings, Notifications, Credits
- List Your Skill flow

Fix any spot that visually regresses (e.g. a card that explicitly used `bg-surface` and now reads too white-on-white needs a `border-border` added). Expect 2–4 small follow-up tweaks max.

## What is explicitly out of scope

- Homepage hero markup and colors
- Footer markup and colors
- Any functional/behavioral change
- Route, schema, RLS, or business logic changes
- Brand role of orange (primary CTA) and green (trust/verified)

## Files touched

- `src/styles.css` (main change)
- Possibly 1–3 small component tweaks discovered during QA (comment bubbles, any stray hardcoded blue background). Each will be a minimal class swap.
