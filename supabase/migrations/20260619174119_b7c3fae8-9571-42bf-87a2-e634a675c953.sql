
ALTER TABLE public.trust_settings
  ADD COLUMN IF NOT EXISTS report_auto_flag_window_days integer NOT NULL DEFAULT 30;

UPDATE public.trust_settings SET report_auto_flag_threshold = 3 WHERE id = 1 AND report_auto_flag_threshold IS NULL;

CREATE OR REPLACE FUNCTION public._tg_profile_report_auto_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cfg record;
  open_in_window integer;
  current_manual public.trust_level;
  owner uuid;
  admin_user uuid;
BEGIN
  SELECT * INTO cfg FROM public.trust_settings WHERE id = 1;
  IF cfg.report_auto_flag_threshold IS NULL OR cfg.report_auto_flag_threshold <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO open_in_window
    FROM public.profile_reports
   WHERE profile_kind = NEW.profile_kind
     AND profile_id   = NEW.profile_id
     AND status = 'open'
     AND created_at >= now() - make_interval(days => COALESCE(cfg.report_auto_flag_window_days, 30));

  IF open_in_window < cfg.report_auto_flag_threshold THEN
    RETURN NEW;
  END IF;

  SELECT manual_level, owner_user_id INTO current_manual, owner
    FROM public.profile_trust_status
   WHERE profile_kind = NEW.profile_kind AND profile_id = NEW.profile_id;

  -- Don't override an existing manual decision
  IF current_manual IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF owner IS NULL THEN
    owner := public._trust_profile_owner(NEW.profile_kind, NEW.profile_id);
  END IF;
  IF owner IS NULL THEN RETURN NEW; END IF;

  -- Apply under_review directly (we're system-level here; can't call admin_set_trust_level)
  INSERT INTO public.profile_trust_status
    (profile_kind, profile_id, owner_user_id, manual_level, manual_reason, manual_set_by, manual_set_at, updated_at)
  VALUES (NEW.profile_kind, NEW.profile_id, owner, 'under_review',
          'auto-flagged: ' || open_in_window || ' open reports in ' || COALESCE(cfg.report_auto_flag_window_days, 30) || ' days',
          NULL, now(), now())
  ON CONFLICT (profile_kind, profile_id) DO UPDATE
    SET manual_level = 'under_review',
        manual_reason = EXCLUDED.manual_reason,
        manual_set_by = NULL,
        manual_set_at = now(),
        updated_at = now()
    WHERE public.profile_trust_status.manual_level IS NULL;

  INSERT INTO public.trust_audit_log
    (actor_id, action, profile_kind, profile_id, owner_user_id, prev_level, new_level, reason)
  VALUES (NULL, 'auto_flag_under_review', NEW.profile_kind, NEW.profile_id, owner,
          NULL, 'under_review',
          'auto-flagged: ' || open_in_window || ' open reports in ' || COALESCE(cfg.report_auto_flag_window_days, 30) || ' days');

  -- Notify the owner
  PERFORM public.create_notification(owner, NULL, 'trust_level_changed', 'profile',
    NEW.profile_id::text,
    'Your profile is under review after receiving multiple reports. Our team will look into it.');

  -- Notify all admins and moderators
  FOR admin_user IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','moderator')
  LOOP
    INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, message)
    VALUES (admin_user, NULL, 'profile_auto_flagged', 'profile', NEW.profile_id::text,
            'A profile was auto-flagged after ' || open_in_window || ' reports — review needed');
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_profile_report_auto_flag ON public.profile_reports;
CREATE TRIGGER tg_profile_report_auto_flag
  AFTER INSERT ON public.profile_reports
  FOR EACH ROW EXECUTE FUNCTION public._tg_profile_report_auto_flag();
