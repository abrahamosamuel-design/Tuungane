-- Lock down PII / sensitive columns from anon (and where appropriate authenticated)
-- and tighten a couple of RLS policies / function configs.

-- 1) business_pages: hide contact fields from anon
REVOKE SELECT (contact_phone, email, whatsapp) ON public.business_pages FROM anon;

-- 2) public_profiles: hide contact fields from anon
REVOKE SELECT (phone, whatsapp, email) ON public.public_profiles FROM anon;

-- 3) service_profiles: hide contact fields from anon
REVOKE SELECT (phone, whatsapp, email) ON public.service_profiles FROM anon;

-- 4) opportunities: hide contact fields from anon
REVOKE SELECT (contact_phone, whatsapp_number, contact_email) ON public.opportunities FROM anon;

-- 5) profiles: hide precise GPS coordinates from anon
REVOKE SELECT (latitude, longitude) ON public.profiles FROM anon;

-- 6) profile_claim_requests: revoke PII columns from authenticated so moderators
--    cannot read them via Data API. Access remains via get_profile_claim_contact
--    RPC which restricts to requester or admin only.
REVOKE SELECT (phone_number, email, whatsapp_number, supporting_file_url)
  ON public.profile_claim_requests FROM authenticated;

-- 7) profile_verification_requests: revoke phone from anon (defense in depth);
--    moderators still need phone via authenticated role for verification review.
REVOKE SELECT (phone) ON public.profile_verification_requests FROM anon;

-- 8) push_config: ensure it remains admin-only (no SELECT for anon/authenticated).
REVOKE ALL ON public.push_config FROM anon, authenticated;
GRANT ALL ON public.push_config TO service_role;
DROP POLICY IF EXISTS push_config_admin_read ON public.push_config;
CREATE POLICY push_config_admin_read ON public.push_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9) _slugify: pin search_path
CREATE OR REPLACE FUNCTION public._slugify(_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = ''
AS $function$
  SELECT trim(both '-' FROM regexp_replace(lower(coalesce(_text,'')), '[^a-z0-9]+', '-', 'g'));
$function$;