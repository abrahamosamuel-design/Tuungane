
-- 1) Add explicit auth guard to matching_requests_for_provider
CREATE OR REPLACE FUNCTION public.matching_requests_for_provider(_provider uuid)
RETURNS SETOF service_requests
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _provider IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
    SELECT r.* FROM public.service_requests r
    WHERE r.status = 'requested' AND r.customer_id <> _provider
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
END;
$function$;

-- 2) Defense-in-depth: explicitly REVOKE column-level SELECT for contact fields from anon
REVOKE SELECT (phone, whatsapp, email) ON public.service_profiles FROM anon;
REVOKE SELECT (contact_phone, whatsapp, email) ON public.business_pages FROM anon;
