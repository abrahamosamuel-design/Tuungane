CREATE OR REPLACE FUNCTION public.set_contact_log_urgency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contact_logs
  SET is_urgent = COALESCE(
    (SELECT urgent_flag FROM public.service_requests WHERE id = NEW.service_request_id),
    false
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER contact_log_urgency
AFTER INSERT ON public.contact_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_contact_log_urgency();