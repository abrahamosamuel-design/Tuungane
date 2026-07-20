-- Narrow scope: the recent security tightening was meant only for profiles
-- (location_visibility_bypass) and service_profiles (phone_visibility_bypass).
-- Re-grant the public_profiles contact columns to authenticated; that table
-- is not in scope for the requested findings and broader read paths (`select('*')`)
-- depend on these columns being readable. Anon already had these revoked
-- in an earlier migration; that remains in place.
GRANT SELECT (phone, whatsapp, email) ON public.public_profiles TO authenticated;