
CREATE OR REPLACE FUNCTION public.fire_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, extensions
AS $$
DECLARE cfg record;
BEGIN
  SELECT trigger_secret, function_url INTO cfg FROM public.push_config WHERE id = 1;
  IF cfg.function_url IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := cfg.function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-trigger-secret', cfg.trigger_secret
    ),
    body := jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id,
      'type', NEW.type,
      'message', NEW.message,
      'target_type', NEW.target_type,
      'target_id', NEW.target_id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fire_push_notification() FROM PUBLIC, anon, authenticated;
