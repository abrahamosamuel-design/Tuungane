-- Align SELECT policies with the existing grant model (no anon access).
-- Anon has no table-level SELECT grant on these tables, so restricting the
-- policies to `authenticated` matches actual behavior and removes the
-- misleading "public" role from the policy scope.

DROP POLICY IF EXISTS bpages_read_all ON public.business_pages;
CREATE POLICY bpages_read_all ON public.business_pages
  FOR SELECT TO authenticated
  USING (
    suspended = false
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS fl_read_all ON public.featured_locations;
CREATE POLICY fl_read_all ON public.featured_locations
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS opps_read_visible ON public.opportunities;
CREATE POLICY opps_read_visible ON public.opportunities
  FOR SELECT TO authenticated
  USING (
    status = ANY (ARRAY['approved'::opportunity_status, 'featured'::opportunity_status])
    OR auth.uid() = poster_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS pp_read_public ON public.public_profiles;
CREATE POLICY pp_read_public ON public.public_profiles
  FOR SELECT TO authenticated
  USING (
    suspended = false
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS sp_read_all ON public.service_profiles;
CREATE POLICY sp_read_all ON public.service_profiles
  FOR SELECT TO authenticated
  USING (
    suspended = false
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS sr_read_open_public ON public.service_requests;
CREATE POLICY sr_read_open_public ON public.service_requests
  FOR SELECT TO authenticated
  USING (
    status = 'requested'::service_request_status
    AND visibility = 'public'::text
  );
