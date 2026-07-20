
-- 1. Column-level revoke of sensitive contact fields from anon
REVOKE SELECT (phone, whatsapp, email) ON public.service_profiles FROM anon;
REVOKE SELECT (email, contact_phone, whatsapp) ON public.business_pages FROM anon;
REVOKE SELECT (contact_phone, whatsapp_number, contact_email) ON public.opportunities FROM anon;

-- 2. Lock down admin_settings to admins/finance_admin only
DROP POLICY IF EXISTS as_read_all ON public.admin_settings;
CREATE POLICY as_read_admin ON public.admin_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance_admin'::app_role));

-- 3. Remove broad listing on storage objects; keep owner/admin listing policy
DROP POLICY IF EXISTS media_read ON storage.objects;
-- Public file URLs continue to work because the bucket is public; only API listing is restricted.

-- 4. Restrict execution of admin-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_deduct_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_expire_boost(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_purchase_request(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_purchase_request(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_deduct_credits(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_expire_boost(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_purchase_request(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_purchase_request(uuid, text) TO service_role;
-- Admins call these via the app's authenticated session; grant back to authenticated so the
-- inner has_role() check remains the gate (it raises 'not authorized' for non-admins).
GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deduct_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_expire_boost(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_purchase_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_purchase_request(uuid, text) TO authenticated;
