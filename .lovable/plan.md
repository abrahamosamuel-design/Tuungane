## Make /credits page publicly accessible

### Problem
The /credits page currently redirects unauthenticated users to /login. The user wants it public so anyone can browse credit packages and learn how the system works.

### Why it works already
- `credit_packages` table has `GRANT SELECT TO anon, authenticated` and an open `cp_read_all` RLS policy.
- No backend migration needed.

### Changes to src/routes/credits.tsx
1. Remove the `useEffect` auth redirect that sends unauthenticated visitors to `/login`.
2. Split data loading:
   - Load `credit_packages` unconditionally on mount (public).
   - Load `credit_transactions` and `credit_purchase_requests` only when `user` exists (personal).
3. Adjust UI conditionally:
   - **Header**: show credit balance when logged in; show generic "Credits" heading + "Log in to buy credits" CTA when logged out.
   - **Packages grid**: keep "Request purchase" button for authenticated users; show "Log in to buy" link for guests.
   - **Purchase requests**: hide section entirely when not logged in.
   - **Transaction history**: show a login prompt with a redirect-back link instead of "No credit activity yet" when not logged in.
4. Clean up the early return (`if (!user) return null;`) so the page renders for everyone.

### No other files touched.