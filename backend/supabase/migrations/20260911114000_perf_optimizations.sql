-- 1. Redefine v_search_services to include latitude and longitude
DROP VIEW IF EXISTS public.v_search_services CASCADE;

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
  COALESCE(pp.verified::text, sp.verified::text, 'unverified'::text) as verified,
  ps.updated_at,
  ps.created_at,
  COALESCE(pp.availability::text, sp.availability::text, 'Available'::text) as availability,
  COALESCE(pp.cover_url, sp.cover_url, (ps.photos)[1]) as cover_url,
  COALESCE(pp.avatar_url, up.avatar_url) as avatar_url,
  ps.photos as media_urls,
  ps.price_type,
  ps.price_fixed_ugx,
  ps.price_min_ugx,
  ps.price_max_ugx,
  ps.price_currency,
  ps.price_note,
  pp.slug,
  COALESCE(pp.latitude, sp.latitude) as latitude,
  COALESCE(pp.longitude, sp.longitude) as longitude
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
  COALESCE(pp.verified::text, 'unverified'::text) as verified,
  pp.updated_at,
  pp.created_at,
  COALESCE(pp.availability::text, 'Available'::text) as availability,
  pp.cover_url,
  pp.avatar_url,
  ARRAY[]::text[] as media_urls,
  null as price_type,
  null as price_fixed_ugx,
  null as price_min_ugx,
  null as price_max_ugx,
  null as price_currency,
  null as price_note,
  pp.slug,
  pp.latitude,
  pp.longitude
FROM public.public_profiles pp
WHERE pp.suspended = false
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
  COALESCE(sp.verified::text, 'unverified'::text) as verified,
  sp.updated_at,
  sp.created_at,
  COALESCE(sp.availability::text, 'Available'::text) as availability,
  sp.cover_url,
  up.avatar_url,
  sp.media_urls,
  null as price_type,
  null as price_fixed_ugx,
  null as price_min_ugx,
  null as price_max_ugx,
  null as price_currency,
  null as price_note,
  null as slug,
  sp.latitude,
  sp.longitude
FROM public.service_profiles sp
LEFT JOIN public.profiles up ON sp.user_id = up.id
WHERE sp.suspended = false
  AND NOT EXISTS (
    SELECT 1 FROM public.public_profiles pp WHERE pp.owner_id = sp.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_services ps WHERE ps.user_profile_id = sp.user_id
  );

GRANT SELECT ON public.v_search_services TO anon, authenticated;

-- 2. Create the enriched view for searching services to avoid N+1 queries
CREATE OR REPLACE VIEW public.v_search_services_enriched AS
SELECT
  s.*,
  p.full_name as profile_full_name,
  COALESCE(s.avatar_url, p.avatar_url) as final_avatar_url,
  COALESCE(t.trust_score, 0) as trust_score,
  COALESCE(t.average_rating, 0) as average_rating,
  COALESCE(t.completed_service_requests, 0) as completed_jobs,
  COALESCE(t.total_verified_reviews, 0) as verified_reviews,
  COALESCE(t.response_rate, 0) as response_rate
FROM public.v_search_services s
LEFT JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.provider_trust_stats t ON s.user_id = t.provider_id;

GRANT SELECT ON public.v_search_services_enriched TO anon, authenticated;

-- 3. Create the get_nearby_services RPC
CREATE OR REPLACE FUNCTION public.get_nearby_services(
  in_lat double precision, 
  in_lng double precision, 
  in_radius_km double precision DEFAULT 50, 
  in_limit integer DEFAULT 20,
  in_offset integer DEFAULT 0
)
 RETURNS TABLE(
   service_id uuid,
   user_id uuid,
   business_name text,
   subcategory text,
   bio text,
   town text,
   district text,
   category_slug text,
   verified text,
   updated_at timestamp with time zone,
   created_at timestamp with time zone,
   availability text,
   cover_url text,
   avatar_url text,
   media_urls text[],
   price_type text,
   price_fixed_ugx numeric,
   price_min_ugx numeric,
   price_max_ugx numeric,
   price_currency text,
   price_note text,
   slug text,
   profile_full_name text,
   final_avatar_url text,
   trust_score numeric,
   average_rating numeric,
   completed_jobs bigint,
   verified_reviews bigint,
   response_rate numeric,
   latitude double precision,
   longitude double precision,
   distance_km double precision
 )
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH bbox AS (
    SELECT
      in_lat - (in_radius_km / 111.0) AS min_lat,
      in_lat + (in_radius_km / 111.0) AS max_lat,
      in_lng - (in_radius_km / (111.0 * cos(radians(in_lat)))) AS min_lng,
      in_lng + (in_radius_km / (111.0 * cos(radians(in_lat)))) AS max_lng
  )
  SELECT
    s.service_id, s.user_id, s.business_name, s.subcategory, s.bio, s.town, s.district,
    s.category_slug, s.verified, s.updated_at, s.created_at, s.availability,
    s.cover_url, s.avatar_url, s.media_urls, s.price_type, s.price_fixed_ugx,
    s.price_min_ugx, s.price_max_ugx, s.price_currency, s.price_note, s.slug,
    s.profile_full_name, s.final_avatar_url, s.trust_score, s.average_rating,
    s.completed_jobs, s.verified_reviews, s.response_rate,
    s.latitude, s.longitude,
    public._haversine_km(in_lat, in_lng, s.latitude, s.longitude) AS distance_km
  FROM public.v_search_services_enriched s, bbox
  WHERE s.latitude IS NOT NULL 
    AND s.longitude IS NOT NULL
    AND s.latitude BETWEEN bbox.min_lat AND bbox.max_lat
    AND s.longitude BETWEEN bbox.min_lng AND bbox.max_lng
    AND public._haversine_km(in_lat, in_lng, s.latitude, s.longitude) <= in_radius_km
  ORDER BY 
    s.trust_score DESC,
    distance_km ASC,
    s.updated_at DESC
  LIMIT GREATEST(in_limit, 1)
  OFFSET in_offset;
$function$;

-- 4. Recreate nearby_service_requests to support pagination (offset)
DROP FUNCTION IF EXISTS public.nearby_service_requests;
CREATE OR REPLACE FUNCTION public.nearby_service_requests(
  in_lat double precision, 
  in_lng double precision, 
  in_radius_km double precision DEFAULT 50, 
  in_limit integer DEFAULT 20,
  in_offset integer DEFAULT 0
)
 RETURNS TABLE(
   id uuid, 
   title text, 
   service_needed text, 
   description text, 
   budget_range text, 
   urgent_flag boolean, 
   created_at timestamp with time zone, 
   district text, 
   town text, 
   area text, 
   location text, 
   latitude double precision, 
   longitude double precision, 
   distance_km double precision
 )
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH bbox AS (
    SELECT
      in_lat - (in_radius_km / 111.0) AS min_lat,
      in_lat + (in_radius_km / 111.0) AS max_lat,
      in_lng - (in_radius_km / (111.0 * cos(radians(in_lat)))) AS min_lng,
      in_lng + (in_radius_km / (111.0 * cos(radians(in_lat)))) AS max_lng
  )
  SELECT
    r.id, r.title, r.service_needed, r.description, r.budget_range, r.urgent_flag,
    r.created_at, r.district, r.town, r.area, r.location, r.latitude, r.longitude,
    public._haversine_km(in_lat, in_lng, r.latitude, r.longitude) AS distance_km
  FROM public.service_requests r, bbox
  WHERE r.visibility = 'public'
    AND r.status = 'requested'
    AND r.provider_id IS NULL
    AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
    AND r.latitude BETWEEN bbox.min_lat AND bbox.max_lat
    AND r.longitude BETWEEN bbox.min_lng AND bbox.max_lng
    AND public._haversine_km(in_lat, in_lng, r.latitude, r.longitude) <= in_radius_km
  ORDER BY distance_km ASC, r.created_at DESC
  LIMIT GREATEST(in_limit, 1)
  OFFSET in_offset;
$function$;
