
-- Lock down anon column access on public-readable tables

-- business_pages
REVOKE SELECT ON public.business_pages FROM anon;
GRANT SELECT (
  id, owner_id, slug, name, org_type, category_slug, subcategory, description,
  logo_url, cover_url, district, town, area, address, opening_hours, services,
  products, verified, is_featured, suspended, seeded_by_official, claim_status,
  created_at, updated_at, country, region
) ON public.business_pages TO anon;

-- opportunities
REVOKE SELECT ON public.opportunities FROM anon;
GRANT SELECT (
  id, expires_at, business_page_id, archived, location, district, town, area,
  description, opportunity_type, requirements, compensation, deadline,
  image_url, poster_id, title, category_slug, poster_type, status,
  is_featured, created_at, updated_at, subcategory
) ON public.opportunities TO anon;

-- public_profiles
REVOKE SELECT ON public.public_profiles FROM anon;
GRANT SELECT (
  id, owner_id, profile_type, slug, name, category_slug, subcategory, bio,
  avatar_url, cover_url, country, region, district, town, area, legacy_source,
  legacy_ref, created_at, updated_at, address, verified, seeded_by_official,
  claim_status, areas_served, service_radius_km, suspended, is_featured,
  availability, opening_hours
) ON public.public_profiles TO anon;

-- service_profiles
REVOKE SELECT ON public.service_profiles FROM anon;
GRANT SELECT (
  user_id, business_name, category_slug, subcategory, bio, district, town, area,
  areas_served, years_experience, verified, availability, suspended,
  created_at, updated_at, cover_url, seeded_by_official, seeded_status,
  country, region, price_type, service_radius_km, header_url, media_urls,
  price_fixed_ugx, price_min_ugx, price_max_ugx, price_currency, price_note,
  price_updated_at, provider_type, price_display, price_min, price_max
) ON public.service_profiles TO anon;

-- service_requests
REVOKE SELECT ON public.service_requests FROM anon;
GRANT SELECT (
  id, urgent_flag, customer_confirmed_completion, provider_confirmed_completion,
  town, description, preferred_date, preferred_time, urgency, budget_range,
  preferred_contact_method, service_profile_id, category_slug, subcategory,
  service_needed, location, district, area, selected_provider_id, visibility,
  title, disputed_at, cancelled_at, completed_at, updated_at, created_at,
  posted_as_type, media_urls, posted_as_name, profile_service_id,
  public_profile_id, posted_as_avatar_url, posted_as_ref_type, posted_as_ref_id,
  status, attachment_url, customer_id, provider_id, region, country
) ON public.service_requests TO anon;

-- featured_locations
REVOKE SELECT ON public.featured_locations FROM anon;
GRANT SELECT (
  id, note, priority, category_slug, area, town, district, region, country,
  updated_at, created_at, created_by_admin_id, active
) ON public.featured_locations TO anon;
