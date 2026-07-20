
-- Indexes to support bbox pre-filter
CREATE INDEX IF NOT EXISTS idx_service_requests_lat_lng ON public.service_requests (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_profiles_lat_lng ON public.service_profiles (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Haversine in km (immutable, parallel safe)
CREATE OR REPLACE FUNCTION public._haversine_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT 2 * 6371 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lon2 - lon1) / 2) ^ 2
  ));
$$;

-- Nearby open public service requests, ranked by distance. Non-contact fields only.
CREATE OR REPLACE FUNCTION public.nearby_service_requests(
  in_lat double precision,
  in_lng double precision,
  in_radius_km double precision DEFAULT 50,
  in_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  service_needed text,
  description text,
  budget_range text,
  urgent_flag boolean,
  created_at timestamptz,
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
PARALLEL SAFE
SET search_path = public
AS $$
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
    AND r.latitude  BETWEEN bbox.min_lat AND bbox.max_lat
    AND r.longitude BETWEEN bbox.min_lng AND bbox.max_lng
    AND public._haversine_km(in_lat, in_lng, r.latitude, r.longitude) <= in_radius_km
  ORDER BY distance_km ASC, r.created_at DESC
  LIMIT GREATEST(in_limit, 1);
$$;

-- Nearby providers, ranked by distance. Non-contact fields only.
-- Includes providers whose service_radius_km reaches the user even if their pin is farther.
CREATE OR REPLACE FUNCTION public.nearby_service_profiles(
  in_lat double precision,
  in_lng double precision,
  in_radius_km double precision DEFAULT 50,
  in_limit integer DEFAULT 20
)
RETURNS TABLE (
  user_id uuid,
  business_name text,
  category_slug text,
  subcategory text,
  district text,
  town text,
  area text,
  areas_served text[],
  service_radius_km integer,
  verified text,
  latitude double precision,
  longitude double precision,
  distance_km double precision
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
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
    -- Widen bbox by the provider's declared service_radius so opted-in coverage isn't missed.
    AND p.latitude  BETWEEN bbox.min_lat - (COALESCE(p.service_radius_km,0) / 111.0)
                        AND bbox.max_lat + (COALESCE(p.service_radius_km,0) / 111.0)
    AND p.longitude BETWEEN bbox.min_lng - (COALESCE(p.service_radius_km,0) / (111.0 * cos(radians(in_lat))))
                        AND bbox.max_lng + (COALESCE(p.service_radius_km,0) / (111.0 * cos(radians(in_lat))))
    AND public._haversine_km(in_lat, in_lng, p.latitude, p.longitude)
        <= GREATEST(in_radius_km, COALESCE(p.service_radius_km, 0))
  ORDER BY distance_km ASC, p.updated_at DESC
  LIMIT GREATEST(in_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public._haversine_km(double precision, double precision, double precision, double precision) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nearby_service_requests(double precision, double precision, double precision, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nearby_service_profiles(double precision, double precision, double precision, integer) TO anon, authenticated, service_role;
