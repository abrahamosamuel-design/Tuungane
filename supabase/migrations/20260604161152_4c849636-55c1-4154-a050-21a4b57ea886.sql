
-- 1) Fix matching_requests_for_provider impersonation
CREATE OR REPLACE FUNCTION public.matching_requests_for_provider(_provider uuid)
 RETURNS SETOF service_requests
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.* FROM public.service_requests r
  WHERE auth.uid() IS NOT NULL
    AND _provider = auth.uid()
    AND r.status = 'requested' AND r.customer_id <> _provider
    AND EXISTS (
      SELECT 1 FROM public.service_profiles sp
      WHERE sp.user_id = _provider
        AND (r.category_slug IS NULL OR sp.category_slug = r.category_slug)
        AND (r.visibility = 'public'
             OR (r.visibility = 'matching_only'
                 AND (r.town IS NULL OR sp.town = r.town
                      OR (sp.areas_served IS NOT NULL AND r.town = ANY(sp.areas_served)))))
    )
  ORDER BY r.created_at DESC LIMIT 100;
$function$;

-- 2) Column-level grants: hide contact fields from anon on service_profiles
REVOKE SELECT ON public.service_profiles FROM anon;
GRANT SELECT (user_id, business_name, category_slug, subcategory, bio, district, town, area,
              areas_served, years_experience, verified, availability, suspended,
              created_at, updated_at, cover_url, seeded_by_official, seeded_status)
  ON public.service_profiles TO anon;

-- 3) Column-level grants: hide contact fields from anon on business_pages
REVOKE SELECT ON public.business_pages FROM anon;
GRANT SELECT (id, owner_id, slug, name, org_type, category_slug, subcategory, description,
              logo_url, cover_url, district, town, area, address, opening_hours,
              services, products, verified, is_featured, seeded_by_official,
              claim_status, suspended, created_at, updated_at)
  ON public.business_pages TO anon;

-- 4) Tighten boosts SELECT to owner/admin, expose a safe public view for badges
DROP POLICY IF EXISTS b_read_all ON public.boosts;
CREATE POLICY b_read_own_or_admin ON public.boosts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'finance_admin'));

CREATE OR REPLACE VIEW public.active_boosts_public
WITH (security_invoker = true) AS
SELECT id, boost_type, entity_type, entity_id, starts_at, expires_at, status
FROM public.boosts
WHERE status = 'active' AND expires_at > now();

GRANT SELECT ON public.active_boosts_public TO anon, authenticated;

-- 5) Lock down admin-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_deduct_credits(uuid, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_expire_boost(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.approve_purchase_request(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_purchase_request(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.matching_requests_for_provider(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_boost(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, text, text, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deduct_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_expire_boost(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_purchase_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_purchase_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matching_requests_for_provider(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_boost(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, text, text, text) TO authenticated;
