-- Revoke contact field SELECT from anon on public-readable tables
REVOKE SELECT (contact_phone, whatsapp, email) ON public.business_pages FROM anon;
REVOKE SELECT (contact_phone, contact_email, whatsapp_number) ON public.opportunities FROM anon;
REVOKE SELECT (phone, email, whatsapp) ON public.service_profiles FROM anon;

-- Prevent providers (or any authenticated user) from reading completion_code via Data API.
-- Access must go through public.get_completion_code / confirm_completion RPCs.
REVOKE SELECT (completion_code) ON public.service_requests FROM authenticated, anon;

-- Remove moderator PII access on contact_reveals. Admins retain access via has_role(...,'admin').
DROP POLICY IF EXISTS cr_read_parties ON public.contact_reveals;
CREATE POLICY cr_read_parties ON public.contact_reveals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = provider_id
    OR public.has_role(auth.uid(), 'admin')
  );
