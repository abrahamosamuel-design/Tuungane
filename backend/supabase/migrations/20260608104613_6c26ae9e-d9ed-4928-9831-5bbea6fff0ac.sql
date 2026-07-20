
CREATE OR REPLACE FUNCTION public.confirm_completion_customer(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT customer_id, provider_confirmed_completion, status INTO r
    FROM public.service_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF auth.uid() <> r.customer_id THEN RAISE EXCEPTION 'not authorized'; END IF;

  UPDATE public.service_requests
     SET customer_confirmed_completion = true,
         status = CASE WHEN provider_confirmed_completion THEN 'completed'::request_status ELSE status END,
         updated_at = now()
   WHERE id = _request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_completion_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_completion_customer(uuid) TO authenticated;
