
-- 1) Server-side completion code verification RPC
CREATE OR REPLACE FUNCTION public.confirm_completion(_request_id uuid, _code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record; submitted text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  submitted := upper(trim(COALESCE(_code, '')));
  IF submitted = '' THEN RAISE EXCEPTION 'code required'; END IF;

  SELECT id, customer_id, provider_id, selected_provider_id, completion_code,
         provider_confirmed_completion, customer_confirmed_completion, status
    INTO r FROM public.service_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;

  IF auth.uid() <> COALESCE(r.selected_provider_id, r.provider_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF r.completion_code IS NULL OR upper(r.completion_code) <> submitted THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  UPDATE public.service_requests
     SET provider_confirmed_completion = true,
         status = CASE WHEN customer_confirmed_completion THEN 'completed'::request_status ELSE status END,
         updated_at = now()
   WHERE id = _request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_completion(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_completion(uuid, text) TO authenticated;

-- 2) Lock down log_admin_activity so non-admins can't forge audit entries
REVOKE EXECUTE ON FUNCTION public.log_admin_activity(text, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
