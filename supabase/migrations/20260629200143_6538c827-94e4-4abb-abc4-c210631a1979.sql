
-- Helper: viewer is the owner of _uid, or an admin/moderator.
CREATE OR REPLACE FUNCTION public._is_owner_or_staff(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    auth.uid() = _uid
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );
$$;

-- Owner-only: full profile row for the current user.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

-- Owner-only: the caller's own service_profiles row, if any.
CREATE OR REPLACE FUNCTION public.get_my_service_profile()
RETURNS SETOF public.service_profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.service_profiles WHERE user_id = auth.uid();
$$;

-- Provider contact reveal honoring phone_visibility + contact gate.
CREATE OR REPLACE FUNCTION public.get_provider_contact(_provider uuid)
RETURNS TABLE(phone text, whatsapp text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_vis text;
  v_unlocked boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF v_uid = _provider
     OR public.has_role(v_uid, 'admin'::app_role)
     OR public.has_role(v_uid, 'moderator'::app_role) THEN
    RETURN QUERY
      SELECT sp.phone, sp.whatsapp, sp.email
      FROM public.service_profiles sp
      WHERE sp.user_id = _provider;
    RETURN;
  END IF;

  SELECT COALESCE(pps.phone_visibility, 'logged_in_only')
    INTO v_vis
  FROM public.provider_privacy_settings pps
  WHERE pps.user_id = _provider;
  v_vis := COALESCE(v_vis, 'logged_in_only');

  SELECT public.can_reveal_contact(v_uid, _provider) INTO v_unlocked;

  IF (v_vis = 'hidden' OR v_vis = 'messages_first') AND NOT v_unlocked THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT sp.phone, sp.whatsapp, sp.email
    FROM public.service_profiles sp
    WHERE sp.user_id = _provider;
END;
$$;

-- Bulk variant of get_profile_card for list views (location masked per visibility).
CREATE OR REPLACE FUNCTION public.get_profile_cards(_ids uuid[])
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text,
  bio text,
  is_provider boolean,
  area text,
  town text,
  district text,
  location_visibility text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.is_provider,
    CASE WHEN public._is_owner_or_staff(p.id)
              OR COALESCE(p.location_visibility,'area') = 'area'
         THEN p.area ELSE NULL END,
    CASE WHEN public._is_owner_or_staff(p.id)
              OR COALESCE(p.location_visibility,'area') IN ('area','town')
         THEN p.town ELSE NULL END,
    CASE WHEN public._is_owner_or_staff(p.id)
              OR COALESCE(p.location_visibility,'area') IN ('area','town','district')
         THEN p.district ELSE NULL END,
    p.location_visibility
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

GRANT EXECUTE ON FUNCTION public._is_owner_or_staff(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_service_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_cards(uuid[]) TO anon, authenticated;

-- DB-level enforcement: revoke direct column reads that bypass visibility prefs.
REVOKE SELECT (latitude, longitude, area, town, district) ON public.profiles FROM authenticated;
REVOKE SELECT (phone, whatsapp, email) ON public.service_profiles FROM authenticated;
REVOKE SELECT (phone, whatsapp, email) ON public.public_profiles FROM authenticated;
