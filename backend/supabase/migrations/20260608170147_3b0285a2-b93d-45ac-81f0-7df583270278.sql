-- 1) service_requests: revoke completion_code column-level access; verification flows through get_completion_code/confirm_completion RPCs.
REVOKE SELECT (completion_code) ON public.service_requests FROM authenticated;
REVOKE SELECT (completion_code) ON public.service_requests FROM anon;

-- 2) profile_claim_requests: revoke contact/document columns from authenticated; expose via SECURITY DEFINER RPC to admin or the requester.
REVOKE SELECT (phone_number, email, whatsapp_number, supporting_file_url) ON public.profile_claim_requests FROM authenticated;
REVOKE SELECT (phone_number, email, whatsapp_number, supporting_file_url) ON public.profile_claim_requests FROM anon;

CREATE OR REPLACE FUNCTION public.get_profile_claim_contact(_id uuid)
RETURNS TABLE(phone_number text, email text, whatsapp_number text, supporting_file_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT pcr.requester_user_id AS requester_user_id,
         pcr.phone_number      AS phone_number,
         pcr.email             AS email,
         pcr.whatsapp_number   AS whatsapp_number,
         pcr.supporting_file_url AS supporting_file_url
    INTO r
    FROM public.profile_claim_requests pcr
   WHERE pcr.id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile claim request not found';
  END IF;
  IF auth.uid() = r.requester_user_id OR public.has_role(auth.uid(), 'admin') THEN
    phone_number := r.phone_number;
    email := r.email;
    whatsapp_number := r.whatsapp_number;
    supporting_file_url := r.supporting_file_url;
    RETURN NEXT;
    RETURN;
  END IF;
  RAISE EXCEPTION 'not authorized';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_claim_contact(uuid) TO authenticated;

-- 3) business_followers: restrict SELECT to authenticated users (was public).
DROP POLICY IF EXISTS bfollow_read_all ON public.business_followers;
CREATE POLICY bfollow_read_authenticated
  ON public.business_followers
  FOR SELECT
  TO authenticated
  USING (true);

-- 4) follows: restrict SELECT to authenticated users (was public).
DROP POLICY IF EXISTS follows_read_all ON public.follows;
CREATE POLICY follows_read_authenticated
  ON public.follows
  FOR SELECT
  TO authenticated
  USING (true);