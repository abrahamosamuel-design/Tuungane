-- Create direct_bookings table
CREATE TABLE public.direct_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_needed text NOT NULL,
  description text,
  price_total numeric,
  quantity integer,
  attachment_url text,
  media_urls text[],
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX direct_bookings_customer_idx ON public.direct_bookings(customer_id);
CREATE INDEX direct_bookings_provider_idx ON public.direct_bookings(provider_id);
CREATE INDEX direct_bookings_status_idx ON public.direct_bookings(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_bookings TO authenticated;
GRANT ALL ON public.direct_bookings TO service_role;

ALTER TABLE public.direct_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view direct bookings" ON public.direct_bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = provider_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can create direct bookings" ON public.direct_bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Parties can update direct bookings" ON public.direct_bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Update conversations table to support direct_booking_id
ALTER TABLE public.conversations 
  ADD COLUMN direct_booking_id uuid REFERENCES public.direct_bookings(id) ON DELETE CASCADE;

-- Make service_request_id nullable, since direct bookings might not have one
ALTER TABLE public.conversations 
  ALTER COLUMN service_request_id DROP NOT NULL;

-- Ensure a conversation is linked to exactly one request OR direct booking
ALTER TABLE public.conversations
  ADD CONSTRAINT conv_link_check CHECK (
    (service_request_id IS NOT NULL AND direct_booking_id IS NULL) OR
    (service_request_id IS NULL AND direct_booking_id IS NOT NULL)
  );

-- Update start_or_get_conversation function to handle both
CREATE OR REPLACE FUNCTION public.start_or_get_conversation(
  _provider_id uuid, _service_request_id uuid DEFAULT NULL, _direct_booking_id uuid DEFAULT NULL, _provider_response_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req record; conv_id uuid; cust uuid; prov uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  
  IF _service_request_id IS NOT NULL THEN
    SELECT customer_id INTO req FROM public.service_requests WHERE id = _service_request_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
    cust := req.customer_id;
  ELSIF _direct_booking_id IS NOT NULL THEN
    SELECT customer_id INTO req FROM public.direct_bookings WHERE id = _direct_booking_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'booking not found'; END IF;
    cust := req.customer_id;
  ELSE
    RAISE EXCEPTION 'must provide service_request_id or direct_booking_id';
  END IF;

  prov := _provider_id;

  IF auth.uid() <> cust AND auth.uid() <> prov THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_blocks WHERE
      (blocker_id = cust AND blocked_id = prov) OR (blocker_id = prov AND blocked_id = cust)) THEN
    RAISE EXCEPTION 'blocked';
  END IF;

  IF _service_request_id IS NOT NULL THEN
    SELECT id INTO conv_id FROM public.conversations
      WHERE service_request_id = _service_request_id AND customer_id = cust AND provider_id = prov;
  ELSE
    SELECT id INTO conv_id FROM public.conversations
      WHERE direct_booking_id = _direct_booking_id AND customer_id = cust AND provider_id = prov;
  END IF;

  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  INSERT INTO public.conversations(service_request_id, direct_booking_id, customer_id, provider_id, provider_response_id)
    VALUES (_service_request_id, _direct_booking_id, cust, prov, _provider_response_id) RETURNING id INTO conv_id;
  RETURN conv_id;
END;
$$;
