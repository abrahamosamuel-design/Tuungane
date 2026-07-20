
-- 1. provider_id nullable
ALTER TABLE public.service_requests ALTER COLUMN provider_id DROP NOT NULL;

-- 2. urgent_flag
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS urgent_flag boolean NOT NULL DEFAULT false;

-- 3. update provider_responses insert policy
DROP POLICY IF EXISTS pr_insert_provider ON public.provider_responses;
CREATE POLICY pr_insert_provider ON public.provider_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = provider_id
    AND EXISTS (
      SELECT 1 FROM public.service_requests r
      WHERE r.id = provider_responses.request_id
        AND r.status = 'requested'
        AND r.customer_id <> auth.uid()
    )
  );

-- 4. update handle_service_request_status: null-safe notify
CREATE OR REPLACE FUNCTION public.handle_service_request_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.service_request_status_history(service_request_id, old_status, new_status, changed_by_user_id)
      VALUES (NEW.id, NULL, NEW.status, NEW.customer_id);
    IF NEW.provider_id IS NOT NULL THEN
      PERFORM public.create_notification(NEW.provider_id, NEW.customer_id, 'request_new', 'service_request', NEW.id::text, 'sent you a new request');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status <> OLD.status THEN
    INSERT INTO public.service_request_status_history(service_request_id, old_status, new_status, changed_by_user_id)
      VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
    IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at := now(); END IF;
    IF NEW.status = 'disputed' AND NEW.disputed_at IS NULL THEN NEW.disputed_at := now(); END IF;

    IF NEW.status = 'accepted' AND NEW.provider_id IS NOT NULL THEN
      PERFORM public.create_notification(NEW.customer_id, NEW.provider_id, 'request_accepted', 'service_request', NEW.id::text, 'accepted your request');
    ELSIF NEW.status = 'in_progress' AND NEW.provider_id IS NOT NULL THEN
      PERFORM public.create_notification(NEW.customer_id, NEW.provider_id, 'request_in_progress', 'service_request', NEW.id::text, 'started your request');
    ELSIF NEW.status = 'completed' AND NEW.provider_id IS NOT NULL THEN
      PERFORM public.create_notification(NEW.customer_id, NEW.provider_id, 'request_completed', 'service_request', NEW.id::text, 'marked the request completed — leave a verified review');
      PERFORM public.create_notification(NEW.provider_id, NEW.customer_id, 'request_completed', 'service_request', NEW.id::text, 'request marked completed');
    ELSIF NEW.status = 'cancelled' THEN
      IF NEW.provider_id IS NOT NULL THEN
        PERFORM public.create_notification(
          CASE WHEN auth.uid() = NEW.customer_id THEN NEW.provider_id ELSE NEW.customer_id END,
          auth.uid(), 'request_cancelled', 'service_request', NEW.id::text, 'cancelled a request');
      END IF;
    ELSIF NEW.status = 'disputed' AND NEW.provider_id IS NOT NULL THEN
      PERFORM public.create_notification(
        CASE WHEN auth.uid() = NEW.customer_id THEN NEW.provider_id ELSE NEW.customer_id END,
        auth.uid(), 'dispute_opened', 'service_request', NEW.id::text, 'opened a dispute on a request');
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- 5. handle_provider_response: backfill provider_id on chosen
CREATE OR REPLACE FUNCTION public.handle_provider_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE req_customer uuid; code text;
BEGIN
  SELECT customer_id INTO req_customer FROM public.service_requests WHERE id = NEW.request_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(req_customer, NEW.provider_id, 'request_response_new', 'service_request', NEW.request_id::text, 'a provider responded to your request');
    RETURN NEW;
  END IF;
  IF NEW.status = 'chosen' AND OLD.status <> 'chosen' THEN
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    UPDATE public.service_requests
      SET status = 'accepted',
          provider_id = COALESCE(provider_id, NEW.provider_id),
          selected_provider_id = NEW.provider_id,
          completion_code = COALESCE(completion_code, code),
          updated_at = now()
      WHERE id = NEW.request_id AND status = 'requested';
    UPDATE public.provider_responses
      SET status = 'declined', updated_at = now()
      WHERE request_id = NEW.request_id AND id <> NEW.id AND status NOT IN ('declined','withdrawn');
    PERFORM public.create_notification(NEW.provider_id, req_customer, 'request_response_chosen', 'service_request', NEW.request_id::text, 'chose your response — you can now start the request');
  END IF;
  RETURN NEW;
END; $function$;

-- 6. archive legacy opportunities
UPDATE public.opportunities SET archived = true WHERE archived = false;
