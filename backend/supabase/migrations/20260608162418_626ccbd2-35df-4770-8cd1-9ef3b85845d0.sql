
-- 1. service_profiles: prevent anon from reading contact fields
REVOKE SELECT (phone, email, whatsapp) ON public.service_profiles FROM anon;

-- 2. profiles: prevent anon from reading precise GPS
REVOKE SELECT (latitude, longitude) ON public.profiles FROM anon;

-- 3. service_requests.completion_code: hide from direct SELECT, expose via RPC to customer only
REVOKE SELECT (completion_code) ON public.service_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_completion_code(_request_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT customer_id, completion_code INTO r
    FROM public.service_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF auth.uid() <> r.customer_id
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'moderator') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN r.completion_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_completion_code(uuid) TO authenticated;

-- 4. opportunity_applications.contact_phone: gate behind explicit reveal
ALTER TABLE public.opportunity_applications
  ADD COLUMN IF NOT EXISTS contact_revealed boolean NOT NULL DEFAULT false;

REVOKE SELECT (contact_phone) ON public.opportunity_applications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_application_phone(_app_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE a record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT oa.applicant_id, oa.contact_phone, oa.contact_revealed, o.poster_id
    INTO a
    FROM public.opportunity_applications oa
    JOIN public.opportunities o ON o.id = oa.opportunity_id
    WHERE oa.id = _app_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  IF auth.uid() = a.applicant_id
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'moderator') THEN
    RETURN a.contact_phone;
  END IF;
  IF auth.uid() = a.poster_id AND a.contact_revealed THEN
    RETURN a.contact_phone;
  END IF;
  RAISE EXCEPTION 'not authorized';
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_application_phone(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reveal_application_contact(_app_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE a record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT oa.contact_phone, o.poster_id
    INTO a
    FROM public.opportunity_applications oa
    JOIN public.opportunities o ON o.id = oa.opportunity_id
    WHERE oa.id = _app_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  IF auth.uid() <> a.poster_id THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.opportunity_applications
     SET contact_revealed = true
   WHERE id = _app_id;
  RETURN a.contact_phone;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reveal_application_contact(uuid) TO authenticated;
