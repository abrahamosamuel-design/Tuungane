
-- Restrict anon column access on public.profiles to non-sensitive discovery fields.
-- Contact fields (org_email, org_phone) and precise coordinates (latitude, longitude,
-- address_description, location_updated_at, location_visibility) plus contact_person,
-- registration_status, has_completed_onboarding must not be readable by anonymous visitors.
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id,
  full_name,
  avatar_url,
  district,
  town,
  bio,
  is_provider,
  country,
  region,
  city,
  area,
  profile_identity,
  organisation_name,
  organisation_type,
  description,
  created_at,
  updated_at
) ON public.profiles TO anon;
