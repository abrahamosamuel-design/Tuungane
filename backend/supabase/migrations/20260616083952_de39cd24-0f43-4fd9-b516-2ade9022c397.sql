-- 1) Lock down profile_claim_requests for anon — contains PII
REVOKE ALL ON public.profile_claim_requests FROM anon;

-- 2) Tighten public_profiles: anon read only, no contact columns
REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT (
  id, owner_id, profile_type, slug, name, category_slug, subcategory,
  bio, avatar_url, cover_url, country, region, district, town, area,
  address, areas_served, latitude, longitude, service_radius_km,
  opening_hours, verified, availability, is_featured, suspended,
  seeded_by_official, claim_status, legacy_source, legacy_ref,
  created_at, updated_at
) ON public.public_profiles TO anon;
