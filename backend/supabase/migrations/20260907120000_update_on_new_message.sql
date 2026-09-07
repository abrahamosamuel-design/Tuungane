CREATE OR REPLACE FUNCTION public.on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  conv record; 
  sender_name text; 
  preview text;
  message_count int;
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
  
  -- Check if this is the first message of a direct conversation
  SELECT count(*) INTO message_count FROM public.messages WHERE conversation_id = NEW.conversation_id;
  
  IF conv.service_request_id IS NULL AND message_count = 1 THEN
    PERFORM public.create_notification(NEW.receiver_id, NEW.sender_id, 'message_new',
      'conversation', NEW.conversation_id::text, sender_name || ' wants to hire you');
  ELSE
    PERFORM public.create_notification(NEW.receiver_id, NEW.sender_id, 'message_new',
      'conversation', NEW.conversation_id::text, sender_name || ' sent you a message');
  END IF;

  RETURN NEW;
END;
$$;
