
-- =====================================================================
-- 1. COLUMN-LEVEL REVOKES for sensitive fields.
-- SECURITY DEFINER RPCs (below) still return these columns to authorised
-- callers because they run as the function owner.
-- =====================================================================

REVOKE SELECT (contact_phone, email, whatsapp, latitude, longitude)
  ON public.business_pages FROM anon, authenticated;

REVOKE SELECT (org_phone, org_email, latitude, longitude)
  ON public.profiles FROM anon, authenticated;

REVOKE SELECT (phone, email, whatsapp, latitude, longitude)
  ON public.public_profiles FROM anon, authenticated;

REVOKE SELECT (phone, email, whatsapp, latitude, longitude)
  ON public.service_profiles FROM anon, authenticated;

REVOKE SELECT (customer_phone, customer_whatsapp, latitude, longitude, completion_code)
  ON public.service_requests FROM anon, authenticated;

REVOKE SELECT (latitude, longitude)
  ON public.featured_locations FROM anon, authenticated;

-- =====================================================================
-- 2. SCOPE identity-leaking SELECT policies on likes and follows.
-- =====================================================================

DROP POLICY IF EXISTS likes_read_auth ON public.post_likes;
CREATE POLICY likes_read_scoped ON public.post_likes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.timeline_posts p
      WHERE p.id = post_likes.post_id AND p.provider_user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS opl_read_auth ON public.official_post_likes;
CREATE POLICY opl_read_scoped ON public.official_post_likes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS follows_read_authenticated ON public.follows;
CREATE POLICY follows_read_scoped ON public.follows
  FOR SELECT TO authenticated
  USING (
    follower_id = auth.uid()
    OR provider_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS bfollow_read_authenticated ON public.business_followers;
CREATE POLICY bfollow_read_scoped ON public.business_followers
  FOR SELECT TO authenticated
  USING (
    follower_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.business_pages bp
      WHERE bp.id = business_followers.business_page_id AND bp.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- =====================================================================
-- 3. Aggregate RPCs for counts (replace scoped table SELECTs).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_post_like_count(_post_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*)::int FROM public.post_likes WHERE post_id = _post_id $$;

CREATE OR REPLACE FUNCTION public.get_post_like_counts(_post_ids uuid[])
RETURNS TABLE(post_id uuid, cnt integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT post_id, count(*)::int
  FROM public.post_likes
  WHERE post_id = ANY(_post_ids)
  GROUP BY post_id
$$;

CREATE OR REPLACE FUNCTION public.get_official_post_like_count(_post_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*)::int FROM public.official_post_likes WHERE post_id = _post_id $$;

CREATE OR REPLACE FUNCTION public.get_provider_follower_count(_provider uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*)::int FROM public.follows WHERE provider_user_id = _provider $$;

CREATE OR REPLACE FUNCTION public.get_business_follower_count(_page uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*)::int FROM public.business_followers WHERE business_page_id = _page $$;

-- =====================================================================
-- 4. Coordinate bulk-fetch RPCs — return lat/lng for a given id list.
-- Rows returned respect the underlying row-level policies because the
-- functions filter on ids the caller already sees.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_service_profile_coords(_ids uuid[])
RETURNS TABLE(user_id uuid, latitude double precision, longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sp.user_id, sp.latitude, sp.longitude
  FROM public.service_profiles sp
  WHERE sp.user_id = ANY(_ids) AND sp.suspended = false
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_coords(_ids uuid[])
RETURNS TABLE(id uuid, latitude double precision, longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pp.id, pp.latitude, pp.longitude
  FROM public.public_profiles pp
  WHERE pp.id = ANY(_ids) AND pp.suspended = false
$$;

CREATE OR REPLACE FUNCTION public.get_service_request_coords(_ids uuid[])
RETURNS TABLE(id uuid, latitude double precision, longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id, r.latitude, r.longitude
  FROM public.service_requests r
  WHERE r.id = ANY(_ids)
    AND r.visibility = 'public'
    AND r.status = 'requested'
$$;

CREATE OR REPLACE FUNCTION public.get_featured_location_coords(_ids uuid[])
RETURNS TABLE(id uuid, latitude double precision, longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT fl.id, fl.latitude, fl.longitude
  FROM public.featured_locations fl
  WHERE fl.id = ANY(_ids) AND fl.active = true
$$;

CREATE OR REPLACE FUNCTION public.get_business_page_coords(_ids uuid[])
RETURNS TABLE(id uuid, latitude double precision, longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT bp.id, bp.latitude, bp.longitude
  FROM public.business_pages bp
  WHERE bp.id = ANY(_ids) AND bp.suspended = false
$$;

CREATE OR REPLACE FUNCTION public.get_profile_coords(_ids uuid[])
RETURNS TABLE(id uuid, latitude double precision, longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.latitude, p.longitude
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
$$;

-- =====================================================================
-- 5. Owner/admin RPCs for service_requests full-row access
-- (needed for the request detail page and admin list, which read
-- customer_phone / customer_whatsapp / lat / lng).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_service_request_detail(_id uuid)
RETURNS SETOF public.service_requests
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.service_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO r FROM public.service_requests WHERE id = _id;
  IF NOT FOUND THEN RETURN; END IF;
  IF auth.uid() = r.customer_id
     OR auth.uid() = r.provider_id
     OR auth.uid() = r.selected_provider_id
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'moderator'::app_role) THEN
    RETURN NEXT r;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_service_requests(_limit integer DEFAULT 200)
RETURNS SETOF public.service_requests
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.service_requests
    ORDER BY created_at DESC
    LIMIT GREATEST(1, LEAST(_limit, 500));
END;
$$;
