
-- Lock down sensitive columns from anonymous (guest) reads on
-- business_pages, public_profiles, and service_requests.
-- Guests keep read access to a safe subset (no phone/email/whatsapp/gps/address/area).

-- business_pages
REVOKE SELECT ON public.business_pages FROM anon;
GRANT SELECT (
  id, owner_id, slug, name, org_type, category_slug, subcategory,
  description, logo_url, cover_url, district, town,
  opening_hours, services, products, verified, is_featured, suspended,
  seeded_by_official, claim_status, country, region, created_at, updated_at
) ON public.business_pages TO anon;

-- public_profiles
REVOKE SELECT ON public.public_profiles FROM anon;
GRANT SELECT (
  id, owner_id, profile_type, slug, name, category_slug, subcategory,
  bio, avatar_url, cover_url, country, region, district, town,
  service_radius_km, opening_hours, verified, availability,
  is_featured, suspended, seeded_by_official, claim_status,
  legacy_source, legacy_ref, created_at, updated_at
) ON public.public_profiles TO anon;

-- service_requests
REVOKE SELECT ON public.service_requests FROM anon;
GRANT SELECT (
  id, provider_id, service_profile_id, category_slug, subcategory,
  service_needed, district, town, description,
  preferred_date, preferred_time, urgency, budget_range,
  preferred_contact_method, status, created_at, updated_at,
  completed_at, cancelled_at, disputed_at, title, visibility,
  selected_provider_id, urgent_flag, country, region,
  public_profile_id, profile_service_id,
  posted_as_type, posted_as_name, posted_as_avatar_url,
  posted_as_ref_type, posted_as_ref_id
) ON public.service_requests TO anon;
