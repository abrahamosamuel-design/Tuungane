
-- Revoke anon access to contact fields on public-readable tables.
-- RLS already allows the row; column-level GRANTs prevent anon from selecting contact columns.

REVOKE SELECT (phone, whatsapp, email) ON public.service_profiles FROM anon;
REVOKE SELECT (contact_phone, whatsapp, email) ON public.business_pages FROM anon;
REVOKE SELECT (contact_phone, whatsapp_number, contact_email) ON public.opportunities FROM anon;

-- provider_privacy_settings: restrict reads to own row + admin/moderator
DROP POLICY IF EXISTS pps_read_authenticated ON public.provider_privacy_settings;
CREATE POLICY pps_read_own_or_admin ON public.provider_privacy_settings
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );
