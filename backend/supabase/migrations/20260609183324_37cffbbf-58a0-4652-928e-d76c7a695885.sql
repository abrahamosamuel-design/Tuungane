
-- User blocks (created first since messages policy references it)
CREATE TABLE public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "See blocks I am part of" ON public.user_blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Block someone" ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Unblock my own block" ON public.user_blocks
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_response_id uuid REFERENCES public.provider_responses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','blocked','reported')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  customer_unread_count integer NOT NULL DEFAULT 0,
  provider_unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_request_id, customer_id, provider_id)
);
CREATE INDEX conversations_customer_idx ON public.conversations(customer_id, last_message_at DESC);
CREATE INDEX conversations_provider_idx ON public.conversations(provider_id, last_message_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = provider_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "Customer creates conversation" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Parties update own conversation" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = provider_id)
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  attachment_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);
CREATE INDEX messages_receiver_unread_idx ON public.messages(receiver_id) WHERE is_read = false;

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read conversation messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (auth.uid() = c.customer_id OR auth.uid() = c.provider_id
             OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
    )
  );

CREATE POLICY "Party sends message" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.status = 'active'
        AND ((auth.uid() = c.customer_id AND receiver_id = c.provider_id)
          OR (auth.uid() = c.provider_id AND receiver_id = c.customer_id))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE b.blocker_id = receiver_id AND b.blocked_id = sender_id
    )
  );

CREATE POLICY "Receiver marks read" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Trigger: on insert, bump conversation and notify
CREATE OR REPLACE FUNCTION public.on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE conv record; sender_name text; preview text;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id FOR UPDATE;
  preview := left(NEW.body, 140);

  IF NEW.receiver_id = conv.customer_id THEN
    UPDATE public.conversations
      SET last_message_at = NEW.created_at, last_message_preview = preview,
          customer_unread_count = customer_unread_count + 1, updated_at = now()
      WHERE id = NEW.conversation_id;
  ELSE
    UPDATE public.conversations
      SET last_message_at = NEW.created_at, last_message_preview = preview,
          provider_unread_count = provider_unread_count + 1, updated_at = now()
      WHERE id = NEW.conversation_id;
  END IF;

  SELECT COALESCE(full_name, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  PERFORM public.create_notification(NEW.receiver_id, NEW.sender_id, 'message_new',
    'conversation', NEW.conversation_id::text, sender_name || ' sent you a message');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_new_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.on_new_message();

CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mark messages read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO conv FROM public.conversations WHERE id = _conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'conversation not found'; END IF;
  IF auth.uid() NOT IN (conv.customer_id, conv.provider_id) THEN RAISE EXCEPTION 'not authorized'; END IF;

  UPDATE public.messages SET is_read = true
    WHERE conversation_id = _conversation_id AND receiver_id = auth.uid() AND is_read = false;

  IF auth.uid() = conv.customer_id THEN
    UPDATE public.conversations SET customer_unread_count = 0, updated_at = now() WHERE id = _conversation_id;
  ELSE
    UPDATE public.conversations SET provider_unread_count = 0, updated_at = now() WHERE id = _conversation_id;
  END IF;
END;
$$;

-- Start or get conversation
CREATE OR REPLACE FUNCTION public.start_or_get_conversation(
  _service_request_id uuid, _provider_id uuid, _provider_response_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req record; conv_id uuid; cust uuid; prov uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT customer_id INTO req FROM public.service_requests WHERE id = _service_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;

  IF auth.uid() = req.customer_id THEN
    cust := req.customer_id; prov := _provider_id;
  ELSIF auth.uid() = _provider_id THEN
    cust := req.customer_id; prov := _provider_id;
  ELSE
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_blocks WHERE
      (blocker_id = cust AND blocked_id = prov) OR (blocker_id = prov AND blocked_id = cust)) THEN
    RAISE EXCEPTION 'blocked';
  END IF;

  SELECT id INTO conv_id FROM public.conversations
    WHERE service_request_id = _service_request_id AND customer_id = cust AND provider_id = prov;
  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  INSERT INTO public.conversations(service_request_id, customer_id, provider_id, provider_response_id)
    VALUES (_service_request_id, cust, prov, _provider_response_id) RETURNING id INTO conv_id;
  RETURN conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_message_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(
    CASE WHEN customer_id = auth.uid() THEN customer_unread_count
         WHEN provider_id = auth.uid() THEN provider_unread_count
         ELSE 0 END), 0)::integer
  FROM public.conversations
  WHERE customer_id = auth.uid() OR provider_id = auth.uid();
$$;

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
