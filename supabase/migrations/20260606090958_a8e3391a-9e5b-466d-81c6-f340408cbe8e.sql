-- 1) SECURITY DEFINER reader that masks location per profiles.location_visibility.
--    Safe for anon to call. Owner and admins/moderators see unmasked.
CREATE OR REPLACE FUNCTION public.get_profile_card(_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  bio text,
  is_provider boolean,
  district text,
  town text,
  area text,
  location_visibility text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean := (auth.uid() IS NOT NULL AND auth.uid() = _id);
  is_staff boolean := (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')));
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.is_provider,
    CASE
      WHEN is_owner OR is_staff THEN p.district
      WHEN COALESCE(p.location_visibility,'area') = 'hidden' THEN NULL
      ELSE p.district
    END AS district,
    CASE
      WHEN is_owner OR is_staff THEN p.town
      WHEN COALESCE(p.location_visibility,'area') IN ('hidden','district') THEN NULL
      ELSE p.town
    END AS town,
    CASE
      WHEN is_owner OR is_staff THEN p.area
      WHEN COALESCE(p.location_visibility,'area') IN ('hidden','district','town') THEN NULL
      ELSE p.area
    END AS area,
    p.location_visibility
  FROM public.profiles p
  WHERE p.id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_card(uuid) TO anon, authenticated, service_role;

-- 2) Column-level lockdown: anonymous visitors lose direct read of precise
--    location columns on profiles. Signed-in users keep read access (the app
--    masker in src/lib/location-visibility.ts handles visibility for them).
REVOKE SELECT (area, town, district, latitude, longitude, location_updated_at, address_description)
  ON public.profiles FROM anon;