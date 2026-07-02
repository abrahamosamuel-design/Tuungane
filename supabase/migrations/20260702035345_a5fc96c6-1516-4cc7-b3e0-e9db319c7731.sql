-- Restore PostgREST role grants on core tables (missing/revoked grants cause "permission denied")
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT SELECT ON public.service_requests TO anon;
GRANT ALL ON public.service_requests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_claim_requests TO authenticated;
GRANT ALL ON public.profile_claim_requests TO service_role;