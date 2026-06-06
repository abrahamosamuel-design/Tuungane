
CREATE OR REPLACE FUNCTION public.admin_search_activity_log(
  _q text DEFAULT NULL,
  _limit int DEFAULT 100,
  _offset int DEFAULT 0,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL
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
  WHERE (_from IS NULL OR l.created_at >= _from)
    AND (_to IS NULL OR l.created_at < _to)
    AND (q IS NULL
     OR l.action ILIKE '%' || q || '%'
     OR ap.full_name ILIKE '%' || q || '%'
     OR tp.full_name ILIKE '%' || q || '%'
     OR au.email::text ILIKE '%' || q || '%'
     OR tu.email::text ILIKE '%' || q || '%'
     OR au.phone::text ILIKE '%' || q || '%'
     OR tu.phone::text ILIKE '%' || q || '%'
     OR l.details::text ILIKE '%' || q || '%')
  ORDER BY l.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500))
  OFFSET GREATEST(0, _offset);
END;
$$;
