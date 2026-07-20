
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Subscriptions
CREATE TABLE public.notification_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX idx_push_subs_user ON public.notification_push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_push_subscriptions TO authenticated;
GRANT ALL ON public.notification_push_subscriptions TO service_role;
ALTER TABLE public.notification_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs select" ON public.notification_push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own subs insert" ON public.notification_push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs update" ON public.notification_push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs delete" ON public.notification_push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Per-category push prefs (server-side mirror)
CREATE TABLE public.notification_push_prefs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_push_prefs TO authenticated;
GRANT ALL ON public.notification_push_prefs TO service_role;
ALTER TABLE public.notification_push_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs all" ON public.notification_push_prefs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Internal config: shared secret + function URL
CREATE TABLE public.push_config (
  id int PRIMARY KEY,
  trigger_secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  function_url text NOT NULL,
  CONSTRAINT push_config_singleton CHECK (id = 1)
);
GRANT ALL ON public.push_config TO service_role;
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;
-- no policies: locked from anon/authenticated

INSERT INTO public.push_config (id, function_url)
  VALUES (1, 'https://bvlbirgazcdibhnawrok.supabase.co/functions/v1/send-push')
  ON CONFLICT (id) DO NOTHING;

-- Trigger function: fires push edge function on every new notification
CREATE OR REPLACE FUNCTION public.fire_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE cfg record;
BEGIN
  SELECT trigger_secret, function_url INTO cfg FROM public.push_config WHERE id = 1;
  IF cfg.function_url IS NULL THEN RETURN NEW; END IF;
  PERFORM extensions.http_post(
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
  -- never block notification insert on push delivery problems
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_push_fire ON public.notifications;
CREATE TRIGGER notifications_push_fire
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.fire_push_notification();
