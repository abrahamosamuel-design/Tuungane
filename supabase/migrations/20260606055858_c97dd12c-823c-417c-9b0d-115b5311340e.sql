
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  target_user_id uuid,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY aal_read_admin ON public.admin_activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_aal_created_at ON public.admin_activity_log (created_at DESC);
CREATE INDEX idx_aal_actor ON public.admin_activity_log (actor_user_id);
CREATE INDEX idx_aal_target ON public.admin_activity_log (target_user_id);
CREATE INDEX idx_aal_action ON public.admin_activity_log (action);

-- Helper to log entries (SECURITY DEFINER so triggered RPCs can insert)
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  _action text, _target_user_id uuid, _target_type text, _target_id text, _details jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_activity_log (actor_user_id, action, target_user_id, target_type, target_id, details)
  VALUES (auth.uid(), _action, _target_user_id, _target_type, _target_id, COALESCE(_details, '{}'::jsonb));
END;
$$;

-- Update grant/revoke role functions to log activity
CREATE OR REPLACE FUNCTION public.admin_grant_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user required'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  PERFORM public.create_notification(_user_id, auth.uid(), 'role_granted',
    'user_role', _user_id::text,
    'You were granted the ' || _role::text || ' role on Tuungane');
  PERFORM public.log_admin_activity('role_granted', _user_id, 'user_role', _user_id::text,
    jsonb_build_object('role', _role::text));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining_admins integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _role = 'admin' THEN
    SELECT count(*) INTO remaining_admins FROM public.user_roles
      WHERE role = 'admin' AND user_id <> _user_id;
    IF remaining_admins < 1 THEN
      RAISE EXCEPTION 'cannot remove the last admin';
    END IF;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  PERFORM public.log_admin_activity('role_revoked', _user_id, 'user_role', _user_id::text,
    jsonb_build_object('role', _role::text));
END;
$$;

-- Searchable history RPC: filters by free-text q (matches action, actor/target name/email/phone)
CREATE OR REPLACE FUNCTION public.admin_search_activity_log(
  _q text DEFAULT NULL, _limit int DEFAULT 100, _offset int DEFAULT 0
) RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  action text,
  details jsonb,
  target_type text,
  target_id text,
  actor_user_id uuid,
  actor_name text,
  actor_email text,
  target_user_id uuid,
  target_name text,
  target_email text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  q := NULLIF(trim(COALESCE(_q, '')), '');
  RETURN QUERY
  SELECT
    l.id, l.created_at, l.action, l.details, l.target_type, l.target_id,
    l.actor_user_id,
    ap.full_name AS actor_name,
    au.email::text AS actor_email,
    l.target_user_id,
    tp.full_name AS target_name,
    tu.email::text AS target_email
  FROM public.admin_activity_log l
  LEFT JOIN public.profiles ap ON ap.id = l.actor_user_id
  LEFT JOIN auth.users au ON au.id = l.actor_user_id
  LEFT JOIN public.profiles tp ON tp.id = l.target_user_id
  LEFT JOIN auth.users tu ON tu.id = l.target_user_id
  WHERE q IS NULL
     OR l.action ILIKE '%' || q || '%'
     OR ap.full_name ILIKE '%' || q || '%'
     OR tp.full_name ILIKE '%' || q || '%'
     OR au.email::text ILIKE '%' || q || '%'
     OR tu.email::text ILIKE '%' || q || '%'
     OR au.phone::text ILIKE '%' || q || '%'
     OR tu.phone::text ILIKE '%' || q || '%'
     OR l.details::text ILIKE '%' || q || '%'
  ORDER BY l.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500))
  OFFSET GREATEST(0, _offset);
END;
$$;
