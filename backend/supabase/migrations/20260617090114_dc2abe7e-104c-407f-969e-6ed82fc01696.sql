
-- business_pages: restrict anon to non-sensitive columns
REVOKE SELECT ON public.business_pages FROM anon;
GRANT SELECT (id, owner_id, slug, name, org_type, category_slug, subcategory, description, logo_url, cover_url, district, town, area, address, opening_hours, services, products, verified, is_featured, suspended, seeded_by_official, claim_status, created_at, updated_at, country, region) ON public.business_pages TO anon;

-- opportunities
REVOKE SELECT ON public.opportunities FROM anon;
GRANT SELECT (id, title, opportunity_type, category_slug, subcategory, location, district, town, area, description, requirements, compensation, deadline, image_url, poster_id, poster_type, status, is_featured, created_at, updated_at, expires_at, business_page_id, archived) ON public.opportunities TO anon;

-- profiles
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, district, town, bio, is_provider, created_at, updated_at, country, region, city, area, address_description, location_visibility, location_updated_at) ON public.profiles TO anon;

-- public_profiles
REVOKE SELECT ON public.public_profiles FROM anon;
GRANT SELECT (id, owner_id, profile_type, slug, name, category_slug, subcategory, bio, avatar_url, cover_url, country, region, district, town, area, address, areas_served, service_radius_km, opening_hours, verified, availability, is_featured, suspended, seeded_by_official, claim_status, legacy_source, legacy_ref, created_at, updated_at) ON public.public_profiles TO anon;

-- service_profiles: tighten policy and restrict anon columns
DROP POLICY IF EXISTS sp_read_all ON public.service_profiles;
CREATE POLICY sp_read_all ON public.service_profiles
  FOR SELECT
  USING (
    suspended = false
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );
REVOKE SELECT ON public.service_profiles FROM anon;
GRANT SELECT (user_id, business_name, category_slug, subcategory, bio, district, town, area, areas_served, years_experience, verified, availability, suspended, created_at, updated_at, cover_url, seeded_by_official, seeded_status, country, region, service_radius_km) ON public.service_profiles TO anon;

-- service_requests: restrict anon columns on the open-public read
REVOKE SELECT ON public.service_requests FROM anon;
GRANT SELECT (id, customer_id, provider_id, service_profile_id, category_slug, subcategory, service_needed, location, district, town, area, description, preferred_date, preferred_time, urgency, budget_range, preferred_contact_method, attachment_url, status, created_at, updated_at, completed_at, cancelled_at, disputed_at, title, visibility, selected_provider_id, provider_confirmed_completion, customer_confirmed_completion, urgent_flag, country, region, public_profile_id, profile_service_id) ON public.service_requests TO anon;

-- profile_claim_requests: stop direct PII reads; force RPC use
REVOKE SELECT ON public.profile_claim_requests FROM authenticated;
GRANT SELECT (id, service_profile_user_id, requester_user_id, full_name, relationship_to_profile, explanation, status, reviewed_by_admin_id, reviewed_at, created_at) ON public.profile_claim_requests TO authenticated;

-- Ensure nearby_* RPCs still work after column REVOKEs by running as definer.
CREATE OR REPLACE FUNCTION public.nearby_service_profiles(in_lat double precision, in_lng double precision, in_radius_km double precision DEFAULT 50, in_limit integer DEFAULT 20)
 RETURNS TABLE(user_id uuid, business_name text, category_slug text, subcategory text, district text, town text, area text, areas_served text[], service_radius_km integer, verified text, latitude double precision, longitude double precision, distance_km double precision)
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

CREATE OR REPLACE FUNCTION public.nearby_service_requests(in_lat double precision, in_lng double precision, in_radius_km double precision DEFAULT 50, in_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, title text, service_needed text, description text, budget_range text, urgent_flag boolean, created_at timestamp with time zone, district text, town text, area text, location text, latitude double precision, longitude double precision, distance_km double precision)
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
    AND r.latitude  BETWEEN bbox.min_lat AND bbox.max_lat
    AND r.longitude BETWEEN bbox.min_lng AND bbox.max_lng
    AND public._haversine_km(in_lat, in_lng, r.latitude, r.longitude) <= in_radius_km
  ORDER BY distance_km ASC, r.created_at DESC
  LIMIT GREATEST(in_limit, 1);
$function$;
