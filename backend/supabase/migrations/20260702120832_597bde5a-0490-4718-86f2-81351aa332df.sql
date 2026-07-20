-- Lock down what the anonymous role can read from provider/request tables.
-- Column-level privileges are enforced before RLS, so revoking sensitive
-- columns from `anon` guarantees signed-out visitors cannot select them
-- even though the row-level policies still allow the row.

-- ============================================================
-- business_pages
-- ============================================================
REVOKE SELECT ON TABLE public.business_pages FROM anon;
GRANT SELECT (
  id, owner_id, slug, name, org_type, category_slug, subcategory,
  description, logo_url, cover_url,
  country, region, district, town, area,
  opening_hours, services, products,
  verified, is_featured, suspended, seeded_by_official, claim_status,
  created_at, updated_at
) ON public.business_pages TO anon;

-- ============================================================
-- public_profiles
-- ============================================================
REVOKE SELECT ON TABLE public.public_profiles FROM anon;
GRANT SELECT (
  id, owner_id, profile_type, slug, name, category_slug, subcategory,
  bio, avatar_url, cover_url,
  country, region, district, town, area,
  areas_served, service_radius_km,
  opening_hours,
  verified, availability, is_featured, suspended, seeded_by_official,
  claim_status, legacy_source, legacy_ref,
  created_at, updated_at
) ON public.public_profiles TO anon;

-- ============================================================
-- service_profiles
-- ============================================================
REVOKE SELECT ON TABLE public.service_profiles FROM anon;
GRANT SELECT (
  user_id, business_name, category_slug, subcategory, bio,
  country, region, district, town, area,
  areas_served, service_radius_km, years_experience,
  verified, availability, suspended,
  cover_url, header_url, media_urls,
  seeded_by_official, seeded_status,
  price_type, price_fixed_ugx, price_min_ugx, price_max_ugx,
  price_currency, price_note, price_updated_at,
  provider_type,
  created_at, updated_at
) ON public.service_profiles TO anon;

-- ============================================================
-- service_requests
-- ============================================================
-- Anonymous visitors can still browse the open public list, but must not
-- see customer phone / WhatsApp / exact coordinates.
REVOKE SELECT ON TABLE public.service_requests FROM anon;
GRANT SELECT (
  id, customer_id, provider_id, service_profile_id,
  category_slug, subcategory, service_needed,
  location, country, region, district, town, area,
  description, preferred_date, preferred_time, urgency,
  budget_range, preferred_contact_method,
  attachment_url, media_urls,
  status, title, visibility,
  selected_provider_id,
  urgent_flag,
  posted_as_type, posted_as_name, posted_as_avatar_url,
  posted_as_ref_type, posted_as_ref_id,
  public_profile_id, profile_service_id,
  created_at, updated_at, completed_at, cancelled_at, disputed_at
) ON public.service_requests TO anon;
