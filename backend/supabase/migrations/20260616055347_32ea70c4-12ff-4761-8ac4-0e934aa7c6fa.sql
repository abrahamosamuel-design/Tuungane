
-- 1. Phone visibility preference on provider_privacy_settings
ALTER TABLE public.provider_privacy_settings
  ADD COLUMN IF NOT EXISTS phone_visibility text NOT NULL DEFAULT 'logged_in_only';

ALTER TABLE public.provider_privacy_settings
  DROP CONSTRAINT IF EXISTS provider_privacy_settings_phone_visibility_check;
ALTER TABLE public.provider_privacy_settings
  ADD CONSTRAINT provider_privacy_settings_phone_visibility_check
  CHECK (phone_visibility IN ('allow_calls','messages_first','logged_in_only','hidden'));

-- 2. Extend contact_logs: nullable request id, add source + service_id, allow message method
ALTER TABLE public.contact_logs
  ALTER COLUMN service_request_id DROP NOT NULL;

ALTER TABLE public.contact_logs
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS service_id uuid;

ALTER TABLE public.contact_logs
  DROP CONSTRAINT IF EXISTS contact_logs_contact_method_check;
ALTER TABLE public.contact_logs
  ADD CONSTRAINT contact_logs_contact_method_check
  CHECK (contact_method IN ('whatsapp','call','in_app','message'));

ALTER TABLE public.contact_logs
  DROP CONSTRAINT IF EXISTS contact_logs_source_check;
ALTER TABLE public.contact_logs
  ADD CONSTRAINT contact_logs_source_check
  CHECK (source IS NULL OR source IN (
    'request_response','provider_profile','service_listing','search_result','request_detail','message_thread'
  ));

-- 3. Loosen insert RLS: customer may log a reveal with or without a service_request
DROP POLICY IF EXISTS "cl_insert_customer" ON public.contact_logs;
CREATE POLICY "cl_insert_customer" ON public.contact_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND (
      service_request_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.service_requests r
        WHERE r.id = contact_logs.service_request_id
          AND r.customer_id = auth.uid()
      )
    )
  );

-- The existing AFTER INSERT trigger reads service_requests.urgent_flag — guard against NULL request_id
CREATE OR REPLACE FUNCTION public.set_contact_log_urgency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.service_request_id IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE public.contact_logs
  SET is_urgent = COALESCE(
    (SELECT urgent_flag FROM public.service_requests WHERE id = NEW.service_request_id),
    false
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
