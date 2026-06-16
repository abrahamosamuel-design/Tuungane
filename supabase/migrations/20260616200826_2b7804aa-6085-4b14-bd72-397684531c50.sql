
-- Trust rank helper: higher is better; suspended/under_review demoted.
CREATE OR REPLACE FUNCTION public.trust_rank(_kind public.profile_kind, _id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE COALESCE(
    (SELECT COALESCE(manual_level, auto_level)
       FROM public.profile_trust_status
      WHERE profile_kind = _kind AND profile_id = _id),
    'new'::public.trust_level)
    WHEN 'suspended' THEN -100
    WHEN 'under_review' THEN -10
    WHEN 'new' THEN 0
    WHEN 'phone_verified' THEN 10
    WHEN 'profile_complete' THEN 20
    WHEN 'reviewed_provider' THEN 30
    WHEN 'verified_provider' THEN 50
    WHEN 'verified_business' THEN 50
    WHEN 'verified_organization' THEN 50
    ELSE 0 END;
$$;

GRANT EXECUTE ON FUNCTION public.trust_rank(public.profile_kind, uuid) TO anon, authenticated, service_role;

-- Update nearby_service_profiles to factor in trust rank.
CREATE OR REPLACE FUNCTION public.nearby_service_profiles(in_lat double precision, in_lng double precision, in_radius_km double precision DEFAULT 50, in_limit integer DEFAULT 20)
 RETURNS TABLE(user_id uuid, business_name text, category_slug text, subcategory text, district text, town text, area text, areas_served text[], service_radius_km integer, verified text, latitude double precision, longitude double precision, distance_km double precision)
 LANGUAGE sql
 STABLE PARALLEL SAFE
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
    p.user_id, p.business_name, p.category_slug, p.subcategory,
    p.district, p.town, p.area, p.areas_served, p.service_radius_km,
    p.verified::text,
    p.latitude, p.longitude,
    public._haversine_km(in_lat, in_lng, p.latitude, p.longitude) AS distance_km
  FROM public.service_profiles p, bbox
  WHERE p.suspended = false
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND p.latitude  BETWEEN bbox.min_lat - (COALESCE(p.service_radius_km,0) / 111.0)
                        AND bbox.max_lat + (COALESCE(p.service_radius_km,0) / 111.0)
    AND p.longitude BETWEEN bbox.min_lng - (COALESCE(p.service_radius_km,0) / (111.0 * cos(radians(in_lat))))
                        AND bbox.max_lng + (COALESCE(p.service_radius_km,0) / (111.0 * cos(radians(in_lat))))
    AND public._haversine_km(in_lat, in_lng, p.latitude, p.longitude)
        <= GREATEST(in_radius_km, COALESCE(p.service_radius_km, 0))
    AND COALESCE(public.trust_rank('service_profile'::public.profile_kind, p.user_id), 0) > -50
  ORDER BY
    public.trust_rank('service_profile'::public.profile_kind, p.user_id) DESC,
    distance_km ASC,
    p.updated_at DESC
  LIMIT GREATEST(in_limit, 1);
$function$;
