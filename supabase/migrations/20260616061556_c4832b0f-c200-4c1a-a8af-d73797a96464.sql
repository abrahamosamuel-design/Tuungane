CREATE OR REPLACE FUNCTION public.send_test_push_notification()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, message)
    VALUES (auth.uid(), NULL, 'message_new', 'conversation', auth.uid()::text,
            'Test notification — your Messages push is working ✅')
    RETURNING id INTO n_id;
  RETURN n_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_test_push_notification() TO authenticated;