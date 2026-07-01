-- Guest browsing: grant anon column-level SELECT on safe subsets so
-- unauthenticated visitors can see public marketplace content without
-- exposing contact fields, exact coordinates, or private area strings.

-- service_profiles: safe public columns only
GRANT SELECT (
  user_id, business_name, category_slug, subcategory, bio,
  district, town, areas_served, years_experience, verified, availability,
  suspended, created_at, updated_at, cover_url, header_url, media_urls,
  service_radius_km, price_type, price_fixed_ugx, price_min_ugx,
  price_max_ugx, price_currency, price_note, price_updated_at
) ON public.service_profiles TO anon;

-- public_profiles: safe public columns only
GRANT SELECT (
  id, owner_id, profile_type, slug, name, category_slug, subcategory, bio,
  avatar_url, cover_url, district, town, areas_served, service_radius_km,
  opening_hours, verified, availability, is_featured, suspended,
  claim_status, created_at, updated_at
) ON public.public_profiles TO anon;

-- service_requests: safe public columns only (RLS already limits rows to
-- visibility='public' AND status='requested' for anon)
GRANT SELECT (
  id, provider_id, service_profile_id, public_profile_id, profile_service_id,
  category_slug, subcategory, service_needed, title, description,
  district, town, preferred_date, preferred_time, urgency, budget_range,
  status, visibility, urgent_flag, media_urls, created_at, updated_at
) ON public.service_requests TO anon;

-- profile_services: needed for per-service price on cards
GRANT SELECT (
  id, profile_id, title, category_slug, description, photos,
  location_served, active, sort_order, price_type, price_fixed_ugx,
  price_min_ugx, price_max_ugx, price_currency, price_note, is_primary,
  created_at, updated_at
) ON public.profile_services TO anon;

-- provider_trust_stats view: public rating aggregates
GRANT SELECT ON public.provider_trust_stats TO anon;

-- Reference data used by category browsing
GRANT SELECT ON public.service_categories TO anon;
GRANT SELECT ON public.service_subcategories TO anon;
