-- Unify all services and profiles for search
CREATE OR REPLACE VIEW public.v_search_services AS
-- 1. All new services (from profile_services)
SELECT 
  ps.id as service_id,
  COALESCE(pp.owner_id, ps.user_profile_id) as user_id,
  ps.title as business_name,
  ps.subcategory,
  ps.description as bio,
  ps.town,
  ps.district,
  ps.category_slug,
  COALESCE(pp.verified::text, 'unverified') as verified,
  ps.updated_at,
  ps.created_at,
  (CASE WHEN ps.active THEN 'available' ELSE 'unavailable' END)::text as availability,
  (CASE WHEN array_length(ps.photos, 1) > 0 THEN ps.photos[1] ELSE pp.avatar_url END) as cover_url,
  pp.avatar_url as avatar_url,
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
WHERE ps.active = true

UNION ALL

-- 2. Legacy public profiles (that don't have profile_services yet)
SELECT 
  pp.id as service_id,
  pp.owner_id as user_id,
  pp.name as business_name,
  pp.subcategory,
  pp.bio as bio,
  pp.town,
  pp.district,
  pp.category_slug,
  pp.verified::text as verified,
  pp.updated_at,
  pp.created_at,
  'available'::text as availability,
  pp.avatar_url as cover_url,
  pp.avatar_url as avatar_url,
  ARRAY[]::text[] as media_urls,
  NULL as price_type,
  NULL::integer as price_fixed_ugx,
  NULL::integer as price_min_ugx,
  NULL::integer as price_max_ugx,
  'UGX' as price_currency,
  NULL as price_note,
  pp.slug
FROM public.public_profiles pp
WHERE pp.suspended = false
  AND pp.profile_type = 'individual'
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_services ps WHERE ps.profile_id = pp.id
  )

UNION ALL

-- 3. Legacy service_profiles (from before public_profiles)
SELECT
  sp.user_id as service_id, -- uuid
  sp.user_id,
  sp.business_name,
  sp.subcategory,
  sp.bio,
  sp.town,
  sp.district,
  sp.category_slug,
  sp.verified::text as verified,
  sp.updated_at,
  sp.created_at,
  sp.availability::text as availability,
  sp.cover_url,
  NULL as avatar_url,
  sp.media_urls,
  sp.price_type,
  sp.price_fixed_ugx,
  sp.price_min_ugx,
  sp.price_max_ugx,
  sp.price_currency,
  sp.price_note,
  NULL as slug
FROM public.service_profiles sp
WHERE sp.suspended = false
  AND NOT EXISTS (
    SELECT 1 FROM public.public_profiles pp WHERE pp.owner_id = sp.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_services ps WHERE ps.user_profile_id = sp.user_id
  );
