# Fix business page creation

## What’s actually wrong
The hosted backend looks healthy, and the `business_pages` row rules exist, but the table currently has **no access grants at all**. That means the browser client can be signed in and still be blocked from creating a row before the row rules even get evaluated.

This likely came from the earlier security/grants changes rather than from a missing feature in the original website prompt.

## Plan
1. Add a database migration that restores the required access on `public.business_pages`:
   - signed-in users can create, edit, and remove their own pages
   - public visitors can view visible pages
   - server/admin operations keep full access
2. Re-check the `business_pages` grants after the migration to confirm the table is reachable again.
3. Tighten the create-page screen error handling so it shows the real backend failure message clearly if anything else is still blocking creation.
4. Validate the creation flow end-to-end from `/businesses/new` and confirm the page redirects to the new business page after save.

## Technical details
- Backend change: restore table-level privileges on `public.business_pages` for `authenticated`, `anon`, and `service_role` in line with the existing row rules.
- Frontend change: keep the current create form, but improve error reporting around media upload and row creation so we can distinguish storage failures from database permission failures instantly.
- No unrelated UI redesign or feature expansion.

## Expected result
A signed-in user can create a business page normally, and if a future failure happens, the screen will report the specific reason instead of only showing a generic failure toast.