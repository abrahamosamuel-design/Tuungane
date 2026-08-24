-- Add district and town to profile_services so services can have their own locations
ALTER TABLE public.profile_services 
ADD COLUMN district text,
ADD COLUMN town text;

-- Update the v_search_services view to prioritize the service's location
DROP VIEW IF EXISTS public.v_search_services;

CREATE VIEW public.v_search_services AS
-- 1. All new services (from profile_services)
SELECT 
  ps.id as service_id,
  COALESCE(pp.owner_id, ps.user_profile_id) as user_id,
  ps.title as business_name,
  ps.subcategory,
  ps.description as bio,
  COALESCE(ps.town, pp.town, up.town) as town,
  COALESCE(ps.district, pp.district, up.district) as district,
  ps.category_slug,
  COALESCE(pp.verified, sp.verified, 'unverified'::text) as verified,
  ps.updated_at,
  ps.created_at,
  COALESCE(pp.availability, sp.availability, 'Available'::text) as availability,
  COALESCE(pp.cover_url, sp.cover_url, (ps.photos)[1]) as cover_url,
  COALESCE(pp.avatar_url, up.avatar_url) as avatar_url,
  ps.photos as media_urls,
  ps.price_type,
  ps.price_fixed_ugx,
  ps.price_min_ugx,
  ps.price_max_ugx,
  ps.price_currency,
  ps.price_note,
  pp.slug
FROM public.profile_services ps
LEFT JOIN public.public_profiles pp ON ps.profile_id = pp.id
LEFT JOIN public.service_profiles sp ON pp.owner_id = sp.user_id
LEFT JOIN public.profiles up ON ps.user_profile_id = up.id
WHERE ps.active = true

UNION ALL

-- 2. Legacy public profiles (that don't have profile_services yet)
SELECT
  pp.id as service_id,
  pp.owner_id as user_id,
  pp.name as business_name,
  pp.subcategory,
  pp.bio,
  pp.town,
  pp.district,
  pp.category_slug,
  COALESCE(pp.verified, 'unverified'::text) as verified,
  pp.updated_at,
  pp.created_at,
  COALESCE(pp.availability, 'Available'::text) as availability,
  pp.cover_url,
  pp.avatar_url,
  ARRAY[]::text[] as media_urls,
  null as price_type,
  null as price_fixed_ugx,
  null as price_min_ugx,
  null as price_max_ugx,
  null as price_currency,
  null as price_note,
  pp.slug
FROM public.public_profiles pp
WHERE pp.suspended = false
  AND pp.profile_type != 'customer'
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_services ps WHERE ps.profile_id = pp.id
  )

UNION ALL

-- 3. Legacy service_profiles (for users who never created a public profile or service)
SELECT
  sp.user_id as service_id,
  sp.user_id,
  sp.business_name,
  sp.subcategory,
  sp.bio,
  sp.town,
  sp.district,
  sp.category_slug,
  COALESCE(sp.verified, 'unverified'::text) as verified,
  sp.updated_at,
  sp.created_at,
  COALESCE(sp.availability, 'Available'::text) as availability,
  sp.cover_url,
  up.avatar_url,
  sp.media_urls,
  null as price_type,
  null as price_fixed_ugx,
  null as price_min_ugx,
  null as price_max_ugx,
  null as price_currency,
  null as price_note,
  null as slug
FROM public.service_profiles sp
LEFT JOIN public.profiles up ON sp.user_id = up.id
WHERE sp.suspended = false
  AND NOT EXISTS (
    SELECT 1 FROM public.public_profiles pp WHERE pp.owner_id = sp.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_services ps WHERE ps.user_profile_id = sp.user_id
  );
