
-- Allow conversations without a service_request_id
ALTER TABLE public.conversations ALTER COLUMN service_request_id DROP NOT NULL;

-- Replace UNIQUE constraint so direct conversations (NULL request) are unique per (customer, provider)
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_service_request_id_customer_id_provider_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_request_unique_idx
  ON public.conversations (service_request_id, customer_id, provider_id)
  WHERE service_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_unique_idx
  ON public.conversations (customer_id, provider_id)
  WHERE service_request_id IS NULL;

-- Helper: open or create a direct (no-request) conversation
CREATE OR REPLACE FUNCTION public.start_direct_conversation(_provider_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE conv_id uuid; cust uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF auth.uid() = _provider_id THEN RAISE EXCEPTION 'cannot message yourself'; END IF;
  cust := auth.uid();

  IF EXISTS (SELECT 1 FROM public.user_blocks WHERE
      (blocker_id = cust AND blocked_id = _provider_id)
      OR (blocker_id = _provider_id AND blocked_id = cust)) THEN
    RAISE EXCEPTION 'blocked';
  END IF;

  SELECT id INTO conv_id FROM public.conversations
    WHERE customer_id = cust AND provider_id = _provider_id AND service_request_id IS NULL
    LIMIT 1;
  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  INSERT INTO public.conversations(service_request_id, customer_id, provider_id)
    VALUES (NULL, cust, _provider_id)
    RETURNING id INTO conv_id;
  RETURN conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_direct_conversation(uuid) TO authenticated;
