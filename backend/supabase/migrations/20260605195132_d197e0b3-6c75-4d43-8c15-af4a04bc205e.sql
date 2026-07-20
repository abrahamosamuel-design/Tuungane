
CREATE OR REPLACE FUNCTION public.admin_list_user_roles(_ids uuid[])
RETURNS TABLE(user_id uuid, role app_role)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT ur.user_id, ur.role FROM public.user_roles ur WHERE ur.user_id = ANY(_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
END;
$$;
