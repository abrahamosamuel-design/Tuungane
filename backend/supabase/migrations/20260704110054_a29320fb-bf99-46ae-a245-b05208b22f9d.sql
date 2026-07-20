
-- =====================================================================
-- 1. Restore public (anon) read access on public-facing tables.
--    Column-level revokes from the earlier hardening migration still
--    hide sensitive fields (phone/email/lat/lng/etc).
-- =====================================================================

GRANT SELECT ON public.business_pages       TO anon;
GRANT SELECT ON public.featured_locations   TO anon, authenticated;
GRANT SELECT ON public.opportunities        TO anon;
GRANT SELECT ON public.public_profiles      TO anon;
GRANT SELECT ON public.service_profiles     TO anon;
GRANT SELECT ON public.service_requests     TO anon;
GRANT SELECT ON public.profiles             TO anon;

-- Ensure authenticated has the standard privileges on post_likes.
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT SELECT ON public.post_likes TO anon;

-- =====================================================================
-- 2. Extend SELECT policies to include anon for publicly-visible rows.
-- =====================================================================

DROP POLICY IF EXISTS bpages_read_all ON public.business_pages;
CREATE POLICY bpages_read_all ON public.business_pages
  FOR SELECT TO anon, authenticated
  USING (
    suspended = false
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS fl_read_all ON public.featured_locations;
CREATE POLICY fl_read_all ON public.featured_locations
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS opps_read_visible ON public.opportunities;
CREATE POLICY opps_read_visible ON public.opportunities
  FOR SELECT TO anon, authenticated
  USING (
    status = ANY (ARRAY['approved'::opportunity_status, 'featured'::opportunity_status])
    OR auth.uid() = poster_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS pp_read_public ON public.public_profiles;
CREATE POLICY pp_read_public ON public.public_profiles
  FOR SELECT TO anon, authenticated
  USING (
    suspended = false
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS sp_read_all ON public.service_profiles;
CREATE POLICY sp_read_all ON public.service_profiles
  FOR SELECT TO anon, authenticated
  USING (
    suspended = false
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS sr_read_open_public ON public.service_requests;
CREATE POLICY sr_read_open_public ON public.service_requests
  FOR SELECT TO anon, authenticated
  USING (
    status = 'requested'::service_request_status
    AND visibility = 'public'::text
  );

-- Allow anon to read author info on public content (contact/coord columns
-- are already revoked at column level).
DROP POLICY IF EXISTS profiles_read_authenticated ON public.profiles;
CREATE POLICY profiles_read_public ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- =====================================================================
-- 3. Onboarding gating flag.
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false;

-- Existing users have already been using the app; don't force them into
-- the new welcome flow.
UPDATE public.profiles
   SET has_completed_onboarding = true
 WHERE has_completed_onboarding = false
   AND created_at < now();
