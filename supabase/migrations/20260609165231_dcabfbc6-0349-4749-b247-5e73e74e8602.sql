DROP POLICY IF EXISTS sr_read_open_public ON public.service_requests;
CREATE POLICY sr_read_open_public ON public.service_requests
  FOR SELECT
  TO anon, authenticated
  USING (status = 'requested' AND visibility = 'public');