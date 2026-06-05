
CREATE OR REPLACE FUNCTION public.admin_list_user_contacts(_ids uuid[])
RETURNS TABLE(id uuid, email text, phone text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, u.phone::text
    FROM auth.users u
    WHERE u.id = ANY(_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_user_contacts(uuid[]) TO authenticated;
