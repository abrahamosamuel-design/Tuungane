
-- Post type enum
CREATE TYPE public.post_type AS ENUM ('work_update','completed_job','available','before_after','new_service','promotion','opportunity_shared');

ALTER TABLE public.timeline_posts ADD COLUMN post_type public.post_type NOT NULL DEFAULT 'work_update';

-- Cover image for providers
ALTER TABLE public.service_profiles ADD COLUMN cover_url text;

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL,
  target_type text,
  target_id text,
  message text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifs_read_own ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notifs_update_own ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notifs_delete_own ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger helper to insert notifications (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.create_notification(_user_id uuid, _actor_id uuid, _type text, _target_type text, _target_id text, _message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _user_id = _actor_id THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, message)
  VALUES (_user_id, _actor_id, _type, _target_type, _target_id, _message);
END;
$$;

-- Follow notification
CREATE OR REPLACE FUNCTION public.notify_on_follow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_notification(NEW.provider_user_id, NEW.follower_id, 'follow', 'profile', NEW.follower_id::text, 'started following you');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Like notification
CREATE OR REPLACE FUNCTION public.notify_on_like() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid;
BEGIN
  SELECT provider_user_id INTO owner FROM public.timeline_posts WHERE id = NEW.post_id;
  PERFORM public.create_notification(owner, NEW.user_id, 'like', 'post', NEW.post_id::text, 'liked your post');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Comment notification
CREATE OR REPLACE FUNCTION public.notify_on_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid;
BEGIN
  SELECT provider_user_id INTO owner FROM public.timeline_posts WHERE id = NEW.post_id;
  PERFORM public.create_notification(owner, NEW.user_id, 'comment', 'post', NEW.post_id::text, 'commented on your post');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Recommendation notification
CREATE OR REPLACE FUNCTION public.notify_on_recommendation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_notification(NEW.provider_user_id, NEW.user_id, 'recommendation', 'profile', NEW.provider_user_id::text, 'recommended you');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_recommendation AFTER INSERT ON public.provider_recommendations FOR EACH ROW EXECUTE FUNCTION public.notify_on_recommendation();

-- Review notification
CREATE OR REPLACE FUNCTION public.notify_on_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_notification(NEW.provider_user_id, NEW.user_id, 'review', 'profile', NEW.provider_user_id::text, 'left you a review');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_review AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.notify_on_review();
