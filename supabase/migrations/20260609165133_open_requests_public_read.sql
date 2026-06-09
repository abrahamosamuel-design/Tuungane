-- Allow anyone (anon + authenticated) to read open, public service requests
-- so the marketplace browse page can list them. Contact columns are still
-- restricted via column-level grants in the prior migration.
DROP POLICY IF EXISTS sr_read_open_public ON public.service_requests;
CREATE POLICY sr_read_open_public ON public.service_requests
  FOR SELECT
  TO anon, authenticated
  USING (status = 'requested' AND visibility = 'public');
